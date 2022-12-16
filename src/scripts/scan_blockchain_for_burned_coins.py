from pastelrpc import *
from tqdm import tqdm


use_testnet=1
if use_testnet:
    burn_address = 'tPpasteLBurnAddressXXXXXXXXXXX3wy7u' 
    url_string = f'https://explorer-testnet-api.pastel.network/v1/addresses/{burn_address}'
else:
    burn_address = 'PtpasteLBurnAddressXXXXXXXXXXbJ5ndd'
    url_string = f'https://explorer-api.pastel.network/v1/addresses/{burn_address}'
    
response = requests.get(url_string)
address_data_dict = response.json()
burn_address_balance = float(address_data_dict['incomingSum'])
print('Burn address balance: {}'.format(burn_address_balance))

tickets_obj = get_all_pastel_blockchain_tickets_func(verbose=1)
list_of_table_names = list(tickets_obj.keys())

for idx, current_table_name in enumerate(list_of_table_names):
    current_table = tickets_obj[current_table_name]
    current_table_txids = current_table['txid'].tolist()
    if idx == 0:
        all_txids = current_table_txids
    else:
        all_txids = all_txids + current_table_txids
list_of_all_ticket_txids = list(set(all_txids))
list_of_all_ticket_txids.sort()
print('Number of unique ticket txids: {}'.format(len(list_of_all_ticket_txids)))

txid_to_total_burn_amount_dict = {}
pbar = tqdm()
for idx, current_txid in enumerate(list_of_all_ticket_txids):
    pbar.set_description('Processing txid: {}'.format(current_txid))
    current_raw_transaction_data = get_raw_transaction_func(current_txid)
    current_vout_data = current_raw_transaction_data['vout']
    total_burn_amount_for_current_txid = decimal.Decimal(0.0)
    for current_vout in current_vout_data:
        vout_type = ''
        if 'scriptPubKey' in current_vout:
            if 'type' in current_vout['scriptPubKey']:
                vout_type = current_vout['scriptPubKey']['type']
        if vout_type == 'multisig':
            current_vout_amount = current_vout['value']
            total_burn_amount_for_current_txid += current_vout_amount
    txid_to_total_burn_amount_dict[current_txid] = total_burn_amount_for_current_txid
    pbar.update(1)
print('Done processing all txids!')

total_burned_in_dust_transactions = sum(txid_to_total_burn_amount_dict.values())
print('Total burned in dust transactions: {}'.format(total_burned_in_dust_transactions))
total_burned_psl = float(total_burned_in_dust_transactions) + burn_address_balance
print('Total burned psl: {}'.format(total_burned_psl))

print('Writing total burned psl to text file...')
with open('total_burned_psl.txt', 'w') as f:
    f.write(str(total_burned_psl))
print('Done!')
