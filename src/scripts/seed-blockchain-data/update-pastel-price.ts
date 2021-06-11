import { Connection } from 'typeorm';

import { PlsPriceEntity } from '../../entity/plsprice.entity';
import marketDataService from '../../services/market-data.service';
import plsPriceService from '../../services/pslprice.service';

export async function updatePrice(connection: Connection): Promise<boolean> {
    const latestStats = await plsPriceService.getLatest();
    try {
        const usdPrice= await marketDataService.getUSDPrice();
        if (typeof usdPrice === 'number') {
            if ( !latestStats || usdPrice !== latestStats.price_usd) {
                const stats: PlsPriceEntity = {
                    price_usd: usdPrice,
                    timestamp: Date.now(),
                };
                await connection.getRepository(PlsPriceEntity).insert(stats);
            }
        }
    } catch (e) {
        console.log('Error >>>', e.message);
    }
   
    return true;
}
