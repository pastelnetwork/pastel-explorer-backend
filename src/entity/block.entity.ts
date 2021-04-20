import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('Block')
export class BlockEntity {
  @PrimaryColumn('varchar', {
    length: 64,
    unique: true,
  })
  id: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public timestamp: number;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  public height: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  public confirmations: number;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  public difficulty: string;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  @Index()
  merkleRoot: string;

  @Column({
    type: 'varchar',
    nullable: true,
    unique: false,
  })
  nextBlockHash: string;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  previousBlockHash: string;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  nonce: string;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  solution: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public size: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public transactionCount: number;
}

// hash:"00000000ed9c5385a5760db92f127fe449c99c21389521b49f097033c69ab4ca"
// height:43343
// merkleroot:"765f68dfd101abec92c910db65b0a5dbbd093d7858852ab83c5795f3ee7e7e06"
// nextblockhash:"000000013228c3b82b498fa50cc758b909b401080fab9fc3416fe9db00de8894"
// nonce:"5276138000000000000000000001000000000000000000000000000033310078"
// previousblockhash:"00000000d7b7184b9639ff338d2da9f1b22b49fa3c3e7c995caf62afe309949d"
// size:2232
// solution:"0012c4be70c057d4729770af3fd231c04de78413e933046c754c71f5fbe334b5090257dc8555447719be013eed6bfac76a43a209510e96cc7dd2e16bd8c012031e4ce385c173eb6408a53b9fd31eea43cd52cc86094cc0de821e77df31bd01416f711ca5525cfc16650fcf8b6147d814072d96c5213f6caac94fe1b8d71919998422b564aa35989016b9be6055d2b9c397ae161b7cd3a631d745834368625059c14f4e72abdd820a019d2d6acf0ac594bf88711a7992930ec53ebd534133930a33ee17658f24b2c66e6ef83d3ed10c1acfaf03ea5baa078f8c80a256019ea47e006d75ed5553461b7bc5bdb7111683098f52ab4e7884bea5bc5c4f3a01e5c4e4dbf120c9b59e8046cb2f51603f745d997f2aa9a7b6912f9e17c8d167d6aee5134a296c128a220344107e8947ce527f9b8187a4b1449dea24bb43651a345baf93d78ca0d99db4eaf7c17b16e4bc1e45be0443ee15ad2a7a8da83260d4cbf89ed08d4294f9f34d1fc4375caac3898817b548edffdf0da1ddef528807f8bde4805ae7d73aa331f730440f40c672da5bc00fcd8ce939d7a11d4e50b4956bb95cd5d393f7d1d90b0c4d7953882b5eee8331bbe4af7ec4f5c677c3b12d11b55bd5505a5563f3f40a61604f5e8d1f7ee0c5185ecb3abf66c73db1616244add434f142d38aa74f371a4fff2fabac177ed9c4e0967be875c64735dbde0c064ce0dfaa699...
// time:1618393014
// transactions:Array(2) [Object, Object]
// tx:Array(2) ["8bafa5bf126169ec027496385710e93e477e59d791f9987e28…", "0630f131dbdc8271b1b7c67329f5eaff9fa74e13b0a6e8ddb5…"]
// length:2
// __proto__:Array(0) [, …]
// 0:"8bafa5bf126169ec027496385710e93e477e59d791f9987e2813190036a75c66"
// 1:"0630f131dbdc8271b1b7c67329f5eaff9fa74e13b0a6e8ddb5c3caf9877692e4"
// valuePools:Array(2) [Object, Object]
// version:4
