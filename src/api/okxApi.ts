import { okxClient } from "./okxDexClient";


interface PortfolioAsset {
  chainId: string;
  balance: string;
  address: string;     // token contract address
  symbol: string;
}

export async function addressAssets(chainId: string, address: string): Promise<PortfolioAsset[]> {
  try {
    const result = await okxClient.get('/api/v5/dex/balance/all-token-balances-by-address', {
      chains: chainId,
      address,
    });
    const portfolio = result?.code === '0' ? result.data[0].tokenAssets ?? [] : [];
    const r = portfolio.map((item: any) => ({
      chainId: item.chainIndex?.toString() ?? chainId,
      balance: item.balance ?? '0',
      address: item.tokenContractAddress ?? '',
      symbol: item.symbol ?? '',
      price: item.tokenPrice 
    }))
    return r;
  } catch (err) {
    console.error('addressAssets error:', err);
    return [];
  }
}

export async function allToken(chainId: string) {
  try {
    const result = await okxClient.get('/api/v5/dex/aggregator/all-tokens', {
      chainIndex: chainId,
    });
    return result;
  } catch (err) {
    console.error('allTokenAssets error:', err);
    return [];
  }
}