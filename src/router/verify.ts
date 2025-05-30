
import express from 'express';
import { ethers } from 'ethers';
import redis from '../db/redis';
import { supportChain } from '../config/chain';
import { createSiweMessage } from '../utils/siwe';
import { signJwt } from '../utils/jwt';
import { SiweMessage } from 'siwe';

const verifyRouter = express.Router();

const NONCE_EXPIRE = 300;

const statement = "This signature proves you are the owner of this wallet. It's for login purposes only.";
//GET /api/verify/signinfo
verifyRouter.get('/signinfo', async (req: any, res: any) => {
    const address = req.query.address;
    const chainId = req.query.chain;
    const isAddress = ethers.isAddress(address);
    console.log('address', address)
    if (!isAddress) {
        return res.status(400).json({
            ok: false,
            error: 'Invalid ethereum Address'
        })
    }
    if (!supportChain.includes(Number.parseInt(chainId))) {
        return res.status(400).json({
            ok: false,
            error: `chain:${chainId} is not supported.`
        })
    }

    const nonce = Math.random().toString(36).substring(2);
    await redis.setEx(`siwe:nonce:${address.toLowerCase()}`, NONCE_EXPIRE, nonce);

    const siweMessage = createSiweMessage(address, 'statement', chainId, nonce);

    res.json({
        nonce: nonce,
        siwe: siweMessage
    })

})

// post /api/verify/
verifyRouter.post('/', async (req: any, res: any) => {
    const { message, signature } = req.body;

    try {
        const recoveredAddress = ethers.verifyMessage(message, signature);
        const expectedNonce = await redis.get(`siwe:nonce:${recoveredAddress.toLowerCase()}`);

        console.log('verify');
        console.log('message', message);
        console.log('recoverAddress:', recoveredAddress)
        console.log('expectedNonce', expectedNonce)

        const siwe = new SiweMessage(message);
        console.log("originNonce", siwe.nonce);

        if (recoveredAddress !== siwe.address) {
            return res.status(400).json({ ok: false, error: 'Invalid signature.' });
        }

        if (!expectedNonce || expectedNonce !== siwe.nonce) {
            return res.status(400).json({ ok: false, error: 'Invalid or expired nonce.' });
        }

        await redis.del(`siwe:nonce:${recoveredAddress.toLowerCase()}`);
        const token = signJwt({ address: recoveredAddress });

        res.json({ ok: true, token, address: recoveredAddress });

    } catch (error) {
        console.log(error);
        res.status(400).json({ ok: false, error: 'Signature verification failed.' });
    }
});

export default verifyRouter;