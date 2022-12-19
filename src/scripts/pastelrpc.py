import http.client as httplib
import base64
import decimal
import json
import logging
import urllib.parse as urlparse
import os
import datetime
import statistics
import hashlib
import pandas as pd
import requests
import time

#pip install requests pandas
# Based on https://github.com/jgarzik/python-bitcoinrpc by Jeff Garzik

USER_AGENT = "AuthServiceProxy/0.1"
HTTP_TIMEOUT = 30

logging.basicConfig()
log = logging.getLogger("PastelRPC")


def get_local_rpc_settings_func(directory_with_patel_conf=os.path.expanduser("~/.pastel/")):
    with open(os.path.join(directory_with_patel_conf, "pastel.conf"), 'r') as f:
        lines = f.readlines()
    other_flags = {}
    rpchost = '127.0.0.1'
    rpcport = '19932'
    for line in lines:
        if line.startswith('rpcport'):
            value = line.split('=')[1]
            rpcport = value.strip()
        elif line.startswith('rpcuser'):
            value = line.split('=')[1]
            rpcuser = value.strip()
        elif line.startswith('rpcpassword'):
            value = line.split('=')[1]
            rpcpassword = value.strip()
        elif line.startswith('rpchost'):
            pass
        elif line == '\n':
            pass
        else:
            current_flag = line.strip().split('=')[0].strip()
            current_value = line.strip().split('=')[1].strip()
            other_flags[current_flag] = current_value
    return rpchost, rpcport, rpcuser, rpcpassword, other_flags
    

class JSONRPCException(Exception):
    def __init__(self, rpc_error):
        parent_args = []
        try:
            parent_args.append(rpc_error['message'])
        except:
            pass
        Exception.__init__(self, *parent_args)
        self.error = rpc_error
        self.code = rpc_error['code'] if 'code' in rpc_error else None
        self.message = rpc_error['message'] if 'message' in rpc_error else None

    def __str__(self):
        return '%d: %s' % (self.code, self.message)

    def __repr__(self):
        return '<%s \'%s\'>' % (self.__class__.__name__, self)


def EncodeDecimal(o):
    if isinstance(o, decimal.Decimal):
        return float(round(o, 8))
    raise TypeError(repr(o) + " is not JSON serializable")
    

class AuthServiceProxy(object):
    __id_count = 0

    def __init__(self, service_url, service_name=None, timeout=HTTP_TIMEOUT, 
                 connection=None, ssl_context=None):
        self.__service_url = service_url
        self.__service_name = service_name
        self.__url = urlparse.urlparse(service_url)
        if self.__url.port is None:
            port = 80
        else:
            port = self.__url.port
        (user, passwd) = (self.__url.username, self.__url.password)
        try:
            user = user.encode('utf8')
        except AttributeError:
            pass
        try:
            passwd = passwd.encode('utf8')
        except AttributeError:
            pass
        authpair = user + b':' + passwd
        self.__auth_header = b'Basic ' + base64.b64encode(authpair)

        self.__timeout = timeout

        if connection:
            # Callables re-use the connection of the original proxy
            self.__conn = connection
        elif self.__url.scheme == 'https':
            self.__conn = httplib.HTTPSConnection(self.__url.hostname, port, timeout=timeout, context=ssl_context)
        else:
            self.__conn = httplib.HTTPConnection(self.__url.hostname, port, timeout=timeout)

    def __getattr__(self, name):
        if name.startswith('__') and name.endswith('__'):
            # Python internal stuff
            raise AttributeError
        if self.__service_name is not None:
            name = "%s.%s" % (self.__service_name, name)
        return AuthServiceProxy(self.__service_url, name, self.__timeout, self.__conn)

    def __call__(self, *args):
        AuthServiceProxy.__id_count += 1

        log.debug("-%s-> %s %s"%(AuthServiceProxy.__id_count, self.__service_name, json.dumps(args, default=EncodeDecimal)))
        postdata = json.dumps({'version': '1.1',
                               'method': self.__service_name,
                               'params': args,
                               'id': AuthServiceProxy.__id_count}, default=EncodeDecimal)
        self.__conn.request('POST', self.__url.path, postdata,
                            {'Host': self.__url.hostname,
                             'User-Agent': USER_AGENT,
                             'Authorization': self.__auth_header,
                             'Content-type': 'application/json'})
        self.__conn.sock.settimeout(self.__timeout)

        response = self._get_response()
        if response.get('error') is not None:
            raise JSONRPCException(response['error'])
        elif 'result' not in response:
            raise JSONRPCException({
                'code': -343, 'message': 'missing JSON-RPC result'})
        
        return response['result']

    def batch_(self, rpc_calls):
        """Batch RPC call.
           Pass array of arrays: [ [ "method", params... ], ... ]
           Returns array of results.
        """
        batch_data = []
        for rpc_call in rpc_calls:
            AuthServiceProxy.__id_count += 1
            m = rpc_call.pop(0)
            batch_data.append({"jsonrpc":"2.0", "method":m, "params":rpc_call, "id":AuthServiceProxy.__id_count})
        postdata = json.dumps(batch_data, default=EncodeDecimal)
        log.debug("--> "+postdata)
        self.__conn.request('POST', self.__url.path, postdata,
                            {'Host': self.__url.hostname,
                             'User-Agent': USER_AGENT,
                             'Authorization': self.__auth_header,
                             'Content-type': 'application/json'})
        results = []
        responses = self._get_response()
        if isinstance(responses, (dict,)):
            if ('error' in responses) and (responses['error'] is not None):
                raise JSONRPCException(responses['error'])
            raise JSONRPCException({
                'code': -32700, 'message': 'Parse error'})
        for response in responses:
            if response['error'] is not None:
                raise JSONRPCException(response['error'])
            elif 'result' not in response:
                raise JSONRPCException({
                    'code': -343, 'message': 'missing JSON-RPC result'})
            else:
                results.append(response['result'])
        return results

    def _get_response(self):
        http_response = self.__conn.getresponse()
        if http_response is None:
            raise JSONRPCException({
                'code': -342, 'message': 'missing HTTP response from server'})

        content_type = http_response.getheader('Content-Type')
        if content_type != 'application/json':
            raise JSONRPCException({
                'code': -342, 'message': 'non-JSON HTTP response with \'%i %s\' from server' % (http_response.status, http_response.reason)})

        responsedata = http_response.read().decode('utf8')
        response = json.loads(responsedata, parse_float=decimal.Decimal)
        if "error" in response and response["error"] is None:
            log.debug("<-%s- %s"%(response["id"], json.dumps(response["result"], default=EncodeDecimal)))
        else:
            log.debug("<-- "+responsedata)
        return response


def get_new_psl_shielded_address_func():
    global rpc_connection
    new_psl_shielded_address = rpc_connection.z_getnewaddress()
    new_psl_shielded_address_priv_key = rpc_connection.z_exportkey(new_psl_shielded_address)
    return new_psl_shielded_address, new_psl_shielded_address_priv_key


def get_new_psl_transparent_address_func():
    global rpc_connection
    new_psl_transparent_address = rpc_connection.getnewaddress()
    new_psl_transparent_address_priv_key = rpc_connection.dumpprivkey(new_psl_transparent_address)
    return new_psl_transparent_address, new_psl_transparent_address_priv_key


def set_pastel_fee_rate_func():
    global rpc_connection
    psl_tx_fee_psl_per_kb = 0.001
    settxfee_command_output = rpc_connection.settxfee((psl_tx_fee_psl_per_kb))
    if settxfee_command_output == True:
        print('Set the PSL tx fee per kb to :' + str(psl_tx_fee_psl_per_kb))
    return settxfee_command_output
        
        
def get_current_pastel_block_height_func():
    global rpc_connection
    best_block_hash = rpc_connection.getbestblockhash()
    best_block_details = rpc_connection.getblock(best_block_hash)
    curent_block_height = best_block_details['height']
    return curent_block_height


def get_pastel_opid_status_func(pastel_opid_string):
    global rpc_connection
    status_response = rpc_connection.z_getoperationresult([pastel_opid_string])
    return status_response


def get_previous_block_hash_and_merkle_root_func():
    global rpc_connection
    previous_block_height = get_current_pastel_block_height_func()
    previous_block_hash = rpc_connection.getblockhash(previous_block_height)
    previous_block_details = rpc_connection.getblock(previous_block_hash)
    previous_block_merkle_root = previous_block_details['merkleroot']
    return previous_block_hash, previous_block_merkle_root, previous_block_height


def get_last_block_data_func():
    global rpc_connection
    current_block_height = get_current_pastel_block_height_func()
    block_data = rpc_connection.getblock(str(current_block_height))
    return block_data
    

def list_all_unspent_amounts_in_wallet_func():
    global rpc_connection
    list_unspent_response_transparent = rpc_connection.listunspent()
    list_unspent_response_shielded = rpc_connection.z_listunspent()
    transparent_unspent_amounts_df = pd.DataFrame(list_unspent_response_transparent)
    transparent_unspent_amounts_df['address_type'] = 'transparent'
    transparent_unspent_amounts_df.rename(columns={'vout': 'outindex'}, inplace=True)
    shielded_unspent_amounts_df = pd.DataFrame(list_unspent_response_shielded)
    shielded_unspent_amounts_df['address_type'] = 'shielded'
    combined_unspent_amounts_df = transparent_unspent_amounts_df.merge(shielded_unspent_amounts_df, how='outer').fillna('')
    combined_address_amounts_df = combined_unspent_amounts_df[['address', 'amount', 'address_type']].groupby(['address', 'address_type']).sum().reset_index()
    return combined_unspent_amounts_df, combined_address_amounts_df


def send_psl_from_one_address_to_another_address_func(sending_address, receiving_address, amount_to_send, memo_field):
    global rpc_connection
    if memo_field is str and len(memo_field) > 0:
        send_results = rpc_connection.z_sendmanywithchangetosender(sending_address, [{'address': receiving_address, 'amount': amount_to_send, 'memo:' : memo_field}])
    else:
        send_results = rpc_connection.z_sendmanywithchangetosender(sending_address, [{'address': receiving_address, 'amount': amount_to_send}]) 
    status_results = get_pastel_opid_status_func(send_results)
    print(send_results[0])
    return status_results[0]


def check_psl_address_balance_func(address_to_check):
    global rpc_connection
    balance_at_address = rpc_connection.z_getbalance(address_to_check) 
    return balance_at_address
  

def get_raw_transaction_func(txid):
    global rpc_connection
    raw_transaction_data = rpc_connection.getrawtransaction(txid, 1) 
    return raw_transaction_data


def merge_shielded_utxos_to_address_func(merge_destination_address):
    global rpc_connection
    merge_command_output = rpc_connection.z_mergetoaddress(['ANY_SAPLING'], merge_destination_address)
    return merge_command_output


def merge_transparent_utxos_to_address_func(merge_destination_address):
    global rpc_connection
    merge_command_output = rpc_connection.z_mergetoaddress(['ANY_TADDR'], merge_destination_address)
    return merge_command_output


def generate_new_pastelid_func(passphrase):
    global rpc_connection
    results_dict = rpc_connection.pastelid('newkey', passphrase)
    new_pastelid = results_dict['pastelid'] #Ed448 public key
    new_legroast_pubkey = results_dict['legRoastKey']
    return new_pastelid, new_legroast_pubkey
    

def list_sn_messages_func():
    global rpc_connection
    supernode_list_df = check_supernode_list_func()
    pastelid_to_txid_vout_dict = dict(zip(supernode_list_df['extKey'], supernode_list_df.index))
    txid_vout_to_pastelid_dict = dict(zip(supernode_list_df.index, supernode_list_df['extKey']))
    messages_list = rpc_connection.masternode('message', 'list')
    messages_list_df = pd.DataFrame()
    for idx, x in enumerate(messages_list):
        current_message = messages_list[idx]
        current_message_df = pd.DataFrame.from_dict(current_message).T
        sending_sn_txid_vout = current_message_df['From'].values.tolist()[0]
        receiving_sn_txid_vout = current_message_df['To'].values.tolist()[0]
        current_message_df['sending_pastelid'] = txid_vout_to_pastelid_dict[sending_sn_txid_vout]
        current_message_df['receiving_pastelid'] = txid_vout_to_pastelid_dict[receiving_sn_txid_vout]
        current_message_body = current_message_df['Message'].values.tolist()[0]
        verification_status = verify_received_message_using_pastelid_func(current_message_body, txid_vout_to_pastelid_dict[sending_sn_txid_vout])
        current_message_df['pastelid_signature_verification_status'] = verification_status
        if idx == 0:
            messages_list_df = current_message_df
        else:
            messages_list_df =  pd.concat([messages_list_df, current_message_df])
    messages_list_df.reset_index(inplace=True)
    messages_list_df['Timestamp'] = pd.to_datetime(messages_list_df['Timestamp'], unit='s')
    return messages_list_df


def list_sn_messages_from_last_k_minutes_func(n=10, message_type='all'):
    messages_list_df = list_sn_messages_func()
    messages_list_df = messages_list_df[messages_list_df['pastelid_signature_verification_status'] == 'OK']
    messages_list_df__recent = messages_list_df[messages_list_df['Timestamp'] > (datetime.datetime.now() - datetime.timedelta(minutes=k))]
    if message_type == 'all':
        messages_list_df__filtered = messages_list_df__recent
        list_of_message_bodies = [json.loads(x)['message'] for x in messages_list_df__filtered['Message'].values.tolist()]
        list_of_message_dicts = [json.loads(x) for x in list_of_message_bodies]
    elif message_type == 'mining_solution_object':
        messages_list_df__filtered = messages_list_df__recent[messages_list_df__recent['Message'].str.contains('mining_solution_object_json')]
        list_of_message_bodies = [json.loads(x)['message'] for x in messages_list_df__filtered['Message'].values.tolist()]
        list_of_message_dicts = [json.loads(x) for x in list_of_message_bodies]
    elif message_type == 'mining_state_object':
        messages_list_df__filtered = messages_list_df__recent[messages_list_df__recent['Message'].str.contains('mining_state_object_json')]
        list_of_message_bodies = [json.loads(x)['message'] for x in messages_list_df__filtered['Message'].values.tolist()]
        list_of_message_dicts = [json.loads(x) for x in list_of_message_bodies]
    return list_of_message_dicts
    
        
def sign_message_with_pastelid_func(pastelid, message_to_sign, passphrase) -> str:
    global rpc_connection
    results_dict = rpc_connection.pastelid('sign', message_to_sign, pastelid, passphrase, 'ed448')
    return results_dict['signature']


def verify_message_with_pastelid_func(pastelid, message_to_verify, pastelid_signature_on_message) -> str:
    global rpc_connection
    verification_result = rpc_connection.pastelid('verify', message_to_verify, pastelid_signature_on_message, pastelid, 'ed448')
    return verification_result['verification']


def send_message_to_sn_using_pastelid_func(message_to_send, receiving_sn_pastelid, pastelid_passphrase):
    global rpc_connection
    local_machine_supernode_data, _, _, _ = get_local_machine_supernode_data_func()
    sending_sn_pastelid = local_machine_supernode_data['extKey'].values.tolist()[0]
    sending_sn_pubkey = local_machine_supernode_data['pubkey'].values.tolist()[0]
    pastelid_signature_on_message = sign_message_with_pastelid_func(sending_sn_pastelid, message_to_send, pastelid_passphrase)
    signed_message_to_send = json.dumps({'message': message_to_send, 'signature': pastelid_signature_on_message})
    specified_machine_supernode_data = get_sn_data_from_pastelid_func(receiving_sn_pastelid)
    receiving_sn_pubkey = specified_machine_supernode_data['pubkey'].values.tolist()[0]
    rpc_connection.masternode('message','send', receiving_sn_pubkey, signed_message_to_send)
    return signed_message_to_send


def broadcast_message_to_all_sns_using_pastelid_func(message_to_send, pastelid_passphrase, verbose=0):
    global rpc_connection
    local_machine_supernode_data, _, _, _ = get_local_machine_supernode_data_func()
    sending_sn_pastelid = local_machine_supernode_data['extKey'].values.tolist()[0]
    sending_sn_pubkey = local_machine_supernode_data['pubkey'].values.tolist()[0]
    pastelid_signature_on_message = sign_message_with_pastelid_func(sending_sn_pastelid, message_to_send, pastelid_passphrase)
    signed_message_to_send = json.dumps({'message': message_to_send, 'signature': pastelid_signature_on_message})
    supernode_list_full_df = check_supernode_list_func()
    list_of_all_sn_pastelids = supernode_list_full_df['extKey'].values.tolist()
    list_of_all_sn_pubkeys = supernode_list_full_df['pubkey'].values.tolist()
    if verbose:
        print('Sending message to all ' + str(len(list_of_all_sn_pastelids)-1) + ' other SNs...')
    for idx, current_receiving_sn_pastelid in enumerate(list_of_all_sn_pastelids):
        if sending_sn_pastelid == current_receiving_sn_pastelid:
            continue
        current_receiving_sn_pubkey = list_of_all_sn_pubkeys[idx]
        if verbose:
            print('Now sending message to SN with PastelID: ' + current_receiving_sn_pastelid + ' and SN pubkey: ' + receiving_sn_pubkey)
        rpc_connection.masternode('message','send', current_receiving_sn_pubkey, signed_message_to_send)
    if verbose:
        print('Message sent to all ' + str(len(list_of_all_sn_pastelids)-1) + ' other SNs')
    return signed_message_to_send


def verify_received_message_using_pastelid_func(message_received, sending_sn_pastelid):
    try:
        message_received_dict = json.loads(message_received)
        raw_message = message_received_dict['message']
        signature = message_received_dict['signature']
        verification_status = verify_message_with_pastelid_func(sending_sn_pastelid, raw_message, signature)
    except:
        verification_status = 'Message is not in the correct format: ' + message_received
    return verification_status


def get_all_local_transactions_func():
    global rpc_connection
    

def get_transparent_transactions_func():
    global rpc_connection
    transparent_transactions_result = rpc_connection.listtransactions()
    transparent_transactions_df = pd.DataFrame(transparent_transactions_result)
    return transparent_transactions_df


def get_shielded_transactions_func():
    global rpc_connection
    shielded_transactions_result = rpc_connection.z_listunspent()
    shielded_transactions_df = pd.DataFrame(shielded_transactions_result)
    return shielded_transactions_df


def get_local_wallet_balance_func():
    global rpc_connection
    z_gettotalbalance_result = rpc_connection.z_gettotalbalance()
    total_transparent_psl_balance = z_gettotalbalance_result['transparent']
    total_shielded_psl_balance = z_gettotalbalance_result['private']
    total_combined_psl_balance = z_gettotalbalance_result['total']
    return total_transparent_psl_balance, total_shielded_psl_balance, total_combined_psl_balance


def get_most_recent_transparent_transaction_dates_and_amounts_func(transparent_transactions_df):
    incoming_transactions_df = transparent_transactions_df[transparent_transactions_df['category'] == 'receive']
    outgoing_transactions_df = transparent_transactions_df[transparent_transactions_df['category'] == 'send']
    most_recent_incoming_transaction_date = pd.to_datetime(incoming_transactions_df['time'].max(), unit='s')
    most_recent_outgoing_transaction_date = pd.to_datetime(outgoing_transactions_df['time'].max(), unit='s')
    most_recent_incoming_transaction_amount = incoming_transactions_df['amount'].max()
    most_recent_outgoing_transaction_amount = outgoing_transactions_df['amount'].max()
    return most_recent_incoming_transaction_date, most_recent_outgoing_transaction_date, most_recent_incoming_transaction_amount, most_recent_outgoing_transaction_amount


def check_supernode_list_func():
    global rpc_connection
    masternode_list_full_command_output = rpc_connection.masternodelist('full')
    masternode_list_rank_command_output = rpc_connection.masternodelist('rank')
    masternode_list_pubkey_command_output = rpc_connection.masternodelist('pubkey')
    masternode_list_extra_command_output = rpc_connection.masternodelist('extra')
    masternode_list_full_df = pd.DataFrame([masternode_list_full_command_output[x].split() for x in masternode_list_full_command_output])
    masternode_list_full_df['txid_vout'] = [x for x in masternode_list_full_command_output]
    masternode_list_full_df.columns = ['supernode_status', 'protocol_version', 'supernode_psl_address', 'lastseentime', 'activeseconds', 'lastpaidtime', 'lastpaidblock', 'ipaddress:port', 'txid_vout']
    masternode_list_full_df.index = masternode_list_full_df['txid_vout']
    masternode_list_full_df.drop(columns=['txid_vout'], inplace=True)
    for current_row in masternode_list_full_df.iterrows():
            current_row_df = pd.DataFrame(current_row[1]).T
            current_txid_vout = current_row_df.index[0]
            current_rank = masternode_list_rank_command_output[current_txid_vout]
            current_pubkey = masternode_list_pubkey_command_output[current_txid_vout]
            current_extra = masternode_list_extra_command_output[current_txid_vout]
            masternode_list_full_df.loc[current_row[0], 'rank'] = current_rank
            masternode_list_full_df.loc[current_row[0], 'pubkey'] = current_pubkey
            masternode_list_full_df.loc[current_row[0], 'extAddress'] = current_extra['extAddress']
            masternode_list_full_df.loc[current_row[0], 'extP2P'] = current_extra['extP2P']
            masternode_list_full_df.loc[current_row[0], 'extKey'] = current_extra['extKey']
    masternode_list_full_df['lastseentime'] = pd.to_datetime(masternode_list_full_df['lastseentime'], unit='s')
    masternode_list_full_df['lastpaidtime'] = pd.to_datetime(masternode_list_full_df['lastpaidtime'], unit='s')
    masternode_list_full_df['activeseconds'] = masternode_list_full_df['activeseconds'].astype(int)
    masternode_list_full_df['lastpaidblock'] = masternode_list_full_df['lastpaidblock'].astype(int)
    masternode_list_full_df['activedays'] = [float(x)/86400.0 for x in masternode_list_full_df['activeseconds'].values.tolist()]
    masternode_list_full_df['rank'] = masternode_list_full_df['rank'].astype(int)
    return masternode_list_full_df
    
    
def get_local_machine_supernode_data_func():
    local_machine_ip = get_external_ip_func()
    supernode_list_full_df = check_supernode_list_func()
    proper_port_number = statistics.mode([x.split(':')[1] for x in supernode_list_full_df['ipaddress:port'].values.tolist()])
    local_machine_ip_with_proper_port = local_machine_ip + ':' + proper_port_number
    local_machine_supernode_data = supernode_list_full_df[supernode_list_full_df['ipaddress:port'] == local_machine_ip_with_proper_port]
    if len(local_machine_supernode_data) == 0:
        print('Local machine is not a supernode!')
        return 0, 0, 0, 0
    else:
        print('Local machine is a supernode!')
        local_sn_rank = local_machine_supernode_data['rank'].values[0]
        local_sn_pastelid = local_machine_supernode_data['extKey'].values[0]
    return local_machine_supernode_data, local_sn_rank, local_sn_pastelid, local_machine_ip_with_proper_port


def get_sn_data_from_pastelid_func(specified_pastelid):
    supernode_list_full_df = check_supernode_list_func()
    specified_machine_supernode_data = supernode_list_full_df[supernode_list_full_df['extKey'] == specified_pastelid]
    if len(specified_machine_supernode_data) == 0:
        print('Specified machine is not a supernode!')
        return pd.DataFrame()
    else:
        return specified_machine_supernode_data

    
def get_sn_data_from_sn_pubkey_func(specified_sn_pubkey):
    supernode_list_full_df = check_supernode_list_func()
    specified_machine_supernode_data = supernode_list_full_df[supernode_list_full_df['pubkey'] == specified_sn_pubkey]
    if len(specified_machine_supernode_data) == 0:
        print('Specified machine is not a supernode!')
        return pd.DataFrame()
    else:
        return specified_machine_supernode_data
   
   
def check_if_transparent_psl_address_is_valid_func(pastel_address_string):
    if len(pastel_address_string) == 35 and (pastel_address_string[0:2] == 'Pt'):
        pastel_address_is_valid = 1
    else:
        pastel_address_is_valid = 0
    return pastel_address_is_valid


def check_if_transparent_lsp_address_is_valid_func(pastel_address_string):
    if len(pastel_address_string) == 35 and (pastel_address_string[0:2] == 'tP'):
        pastel_address_is_valid = 1
    else:
        pastel_address_is_valid = 0
    return pastel_address_is_valid


def get_df_from_tickets_list_rpc_response_func(rpc_response):
    tickets_df = pd.DataFrame.from_records([rpc_response[idx]['ticket'] for idx, x in enumerate(rpc_response)])
    tickets_df['txid'] = [rpc_response[idx]['txid'] for idx, x in enumerate(rpc_response)]
    tickets_df['height'] = [rpc_response[idx]['height'] for idx, x in enumerate(rpc_response)]
    return tickets_df


def get_all_pastel_blockchain_tickets_func(verbose=0):
    with MyTimer():
        if verbose:
            print('Now retrieving all Pastel blockchain tickets...')
        tickets_obj = {}
        list_of_ticket_types = ['id', 'nft', 'offer', 'accept', 'transfer', 'nft-collection', 'nft-collection-act', 'royalty', 'username', 'ethereumaddress', 'action', 'action-act']
        for current_ticket_type in list_of_ticket_types:
            if verbose:
                print('Getting ' + current_ticket_type + ' tickets...')
            response = rpc_connection.tickets('list', current_ticket_type)
            if response is not None and len(response) > 0:
                tickets_obj[current_ticket_type] = get_df_from_tickets_list_rpc_response_func(response)
    return tickets_obj




#Misc helper functions:
class MyTimer():
    def __init__(self):
        self.start = time.time()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        end = time.time()
        runtime = end - self.start
        msg = '({time} seconds to complete)'
        print(msg.format(time=round(runtime, 2)))


def compute_elapsed_time_in_minutes_between_two_datetimes_func(start_datetime, end_datetime):
    time_delta = (end_datetime - start_datetime)
    total_seconds_elapsed = time_delta.total_seconds()
    total_minutes_elapsed = total_seconds_elapsed / 60
    return total_minutes_elapsed


def compute_elapsed_time_in_minutes_since_start_datetime_func(start_datetime):
    end_datetime = datetime.datetime.now()
    total_minutes_elapsed = compute_elapsed_time_in_minutes_between_two_datetimes_func(start_datetime, end_datetime)
    return total_minutes_elapsed


def get_sha256_hash_of_input_data_func(input_data_or_string):
    if isinstance(input_data_or_string, str):
        input_data_or_string = input_data_or_string.encode('utf-8')
    sha256_hash_of_input_data = hashlib.sha3_256(input_data_or_string).hexdigest()
    return sha256_hash_of_input_data


def check_if_ip_address_is_valid_func(ip_address_string):
    try:
        _ = ipaddress.ip_address(ip_address_string)
        ip_address_is_valid = 1
    except Exception as e:
        print('Validation Error: ' + str(e))
        ip_address_is_valid = 0
    return ip_address_is_valid


def get_external_ip_func():
    output = os.popen('curl ifconfig.me')
    ip_address = output.read()
    # try:
    #     #external_ip = requests.get('https://api.ipify.org').text
    #     external_ip = requests.get('https://ipapi.co/ip/').text
    # except:
    #     print('Cannot get external IP address! Returning empty string...')
    #     external_ip = ''
    # return external_ip
    return ip_address


def check_if_pasteld_is_running_correctly_and_relaunch_if_required_func():
    pasteld_running_correctly = 0
    try:
        current_pastel_block_number = get_current_pastel_block_height_func()
    except:
        print('Problem running pastel-cli command!')
        current_pastel_block_number = ''
    if isinstance(current_pastel_block_number, int):
        if current_pastel_block_number > 100000:
            pasteld_running_correctly = 1
            print('Pasteld is running correctly!')
    if pasteld_running_correctly == 0:
        process_output = os.system("cd /home/pastelup/ && tmux new -d ./pastelup start walletnode --development-mode")
    return pasteld_running_correctly


def install_pasteld_func(network_name='testnet'):
    install_pastelup_script_command_string = f"mkdir ~/pastelup && cd ~/pastelup && wget https://github.com/pastelnetwork/pastelup/releases/download/v1.1.3/pastelup-linux-amd64 && mv pastelup-linux-amd64 pastelup && chmod 755 pastelup"
    command_string = f"cd ~/pastelup && ./pastelup install walletnode -n={network_name} --force -r=latest -p=18.118.218.206,18.116.26.219 && \
                        sed -i -e '/hostname/s/localhost/0.0.0.0/' ~/.pastel/walletnode.yml && \
                        sed -i -e '$arpcbind=0.0.0.0' ~/.pastel/pastel.conf && \
                        sed -i -e '$arpcallowip=172.0.0.0/8' ~/.pastel/pastel.conf && \
                        sed -i -e 's/rpcuser=.*/rpcuser=rpc_user/' ~/.pastel/pastel.conf && \
                        sed -i -e 's/rpcpassword=.*/rpcpassword=rpc_pwd/' ~/.pastel/pastel.conf"
    #check if pastelup is already installed:
    if os.path.exists('~/pastelup/pastelup'):
        print('Pastelup is already installed!')
        print('Running pastelup install command...')
        try:
            command_result = os.system(command_string)
            if not command_result:
                print('Pastelup install command appears to have run successfully!')
        except:
            print('Error running pastelup install command! Message: ' + str(command_result))
    else:
        print('Pastelup is not installed, trying to install it...')
        try:
            install_result = os.system(install_pastelup_script_command_string)
            if not install_result:
                print('Pastelup installed successfully!')
                print('Running pastelup install command...')
                command_result = os.system(command_string)
            else:
                print('Pastelup installation failed! Message: ' + str(install_result))
        except:
            print('Error running pastelup install command! Message: ' + str(install_result))
    return
            
#_______________________________________________________________________________________________________________________________

rpc_host, rpc_port, rpc_user, rpc_password, other_flags = get_local_rpc_settings_func()
rpc_connection = AuthServiceProxy("http://%s:%s@%s:%s"%(rpc_user, rpc_password, rpc_host, rpc_port), timeout=2)

#block_data = get_last_block_data_func()
#supernode_list_full_df = check_supernode_list_func()
#local_machine_supernode_data, local_sn_rank, local_sn_pastelid, local_machine_ip_with_proper_port = get_local_machine_supernode_data_func()


use_demonstrate_rpc = 0

if use_demonstrate_rpc:
    use_try_batch_commands = 0
    if use_try_batch_commands: #batch support : print timestamps of blocks 0 to 99 in 2 RPC round-trips:
        commands = [ [ "getblockhash", height] for height in range(100) ]
        block_hashes = rpc_connection.batch_(commands)
        blocks = rpc_connection.batch_([ [ "getblock", h ] for h in block_hashes ])
        block_times = [ block["time"] for block in blocks ]
        print(block_times)

    settxfee_command_output = set_pastel_fee_rate_func()

    list_of_opid_strings = rpc_connection.z_listoperationids()
    if len(list_of_opid_strings) > 0:
        test_opid_string = list_of_opid_strings[0]
        status_response = get_pastel_opid_status_func(test_opid_string)
    
    supernode_list_full_df = check_supernode_list_func()
    local_machine_supernode_data, local_sn_rank, local_sn_pastelid, local_machine_ip_with_proper_port = get_local_machine_supernode_data_func()
    print('local_machine_supernode_data: \n', local_machine_supernode_data)

    curent_block_height = get_current_pastel_block_height_func()
    previous_block_hash, previous_block_merkle_root, previous_block_height = get_previous_block_hash_and_merkle_root_func()

    address_to_check = "tPgBJQr2pX1giAdZuZNiauT1nYWWp4nKYcj"
    balance_at_address1 = check_psl_address_balance_func(address_to_check)
    combined_unspent_amounts_df, combined_address_amounts_df = list_all_unspent_amounts_in_wallet_func()
    balance_at_address2 = check_psl_address_balance_func(combined_address_amounts_df['address'][0])
    balance_at_address2_check = combined_address_amounts_df['amount'][0]
    assert(balance_at_address2 == balance_at_address2_check)

    pastelid_passphrase = '5QcX9nX67buxyeC'

    use_gen_pastelid = 0
    if use_gen_pastelid:
        new_pastelid, new_legroast_pubkey = generate_new_pastelid_func(pastelid_passphrase)
    else:
        new_pastelid = 'jXaSxXbUn88rsK1G1Z8qSb9wMk1YwEZBhUoySpxw3vgUPj7fUBj6MAGGzMh35K3rbMcsQJWhY9khvf1CtDkio3'

    message_to_sign = 'This is a test message to sign'
    pastelid_signature_on_message = sign_message_with_pastelid_func(new_pastelid, message_to_sign, pastelid_passphrase)

    message_to_verify = message_to_sign
    verification_result = verify_message_with_pastelid_func(new_pastelid, message_to_verify, pastelid_signature_on_message)

    use_send_coins = 0
    if use_send_coins:
        sending_address = combined_address_amounts_df['address'][1]
        receiving_address = 'tPgBJQr2pX1giAdZuZNiauT1nYWWp4nKYcj'
        amount_to_send = 5.05
        send_results1 = send_psl_from_one_address_to_another_address_func(sending_address, receiving_address, amount_to_send, '')

        receiving_address = 'ptestsapling1pf45537xh6re9rfapuyru4jwj0sfnc23hc0nkvjdglqgdfkgy5w8ldh5rac0eh8qmvsyxc4a0mr'
        send_results2 = send_psl_from_one_address_to_another_address_func(sending_address, receiving_address, amount_to_send, 'this is a test memo')

    transparent_transactions_df = get_transparent_transactions_func()
    shielded_transactions_df = get_shielded_transactions_func()
    most_recent_incoming_transaction_date, most_recent_outgoing_transaction_date, most_recent_incoming_transaction_amount, most_recent_outgoing_transaction_amount = get_most_recent_transparent_transaction_dates_and_amounts_func(transparent_transactions_df)
    total_transparent_psl_balance, total_shielded_psl_balance, total_combined_psl_balance = get_local_wallet_balance_func()

    use_generate_new_addresses = 0
    if use_generate_new_addresses:
        new_psl_shielded_address, new_psl_shielded_address_priv_key = get_new_psl_shielded_address_func()
        new_psl_transparent_address, new_psl_transparent_address_priv_key = get_new_psl_transparent_address_func()

    tickets_obj = get_all_pastel_blockchain_tickets_func(verbose=1)

    use_send_sn_message = 0
    if use_send_sn_message:
        receiving_sn_pastelid = 'jXa7Ypp5fueoTboLYxAbH2ebaGLiQBRDF2u2PFAMYYGRjSMsEzn5sgSgyAy5xYpEfcMUqaUY6xZ8Qcxnn1pWAf'
        message_to_send = 'This is a test of the messaging capability 3.'
        pastelid_passphrase = '5QcX9nX67buxyeC'
        signed_message_sent = send_message_to_sn_using_pastelid_func(message_to_send, receiving_sn_pastelid, pastelid_passphrase)
        sn_message_list_df = list_sn_messages_func()

    use_broadcast_sn_message = 0
    if use_broadcast_sn_message:
        signed_message_sent = broadcast_message_to_all_sns_using_pastelid_func(message_to_send, pastelid_passphrase, verbose=1)
    
    use_try_merge_commands = 0
    if use_try_merge_commands:
        if 'experimentalfeatures' in other_flags.keys() and 'zmergetoaddress' in other_flags.keys():
            if other_flags['experimentalfeatures'] == 1 and other_flags['zmergetoaddress'] == 1:
                merge_destination_address = 'ptestsapling1pf45537xh6re9rfapuyru4jwj0sfnc23hc0nkvjdglqgdfkgy5w8ldh5rac0eh8qmvsyxc4a0mr'
                merge_command_output = merge_shielded_utxos_to_address_func(merge_destination_address)
                merge_command_output = merge_transparent_utxos_to_address_func(merge_destination_address)
                print('Done!')