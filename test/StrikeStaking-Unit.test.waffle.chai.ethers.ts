//import { OutliningSpanKind } from "typescript";

//import { isCallSignatureDeclaration } from "typescript";
const { isCallSignatureDeclaration } = require("typescript");
const { OutliningSpanKind } = require("typescript");

import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { expect }  from "chai";

// @ts-ignore
// import { PERMIT_TYPEHASH, getPermitDigest, getDomainSeparator, sign } from './utils/signatures'

// type Contract = any

describe('strike Staking', () => {


    let
      // Used as default deployer for contracts, asks as owner of contracts.
      deployer,
      addr1,
      Treasury,
      treasury,
      Staking,
      staking,
      STRIKE,
      strike,
      sSTRIKE,
      sstrike,
      addr2,
      addr3,
      v, 
      r, 
      s,
      nonce,
      nonceAddr1,
      deadline,
      domain,
      domainAddr1,
      types,
      val,
      valAddr1,
      tokenAmount,
      sig,
      sigAddr1,
      CalculateEpoch,
      calculateEpoch

    beforeEach(async () => {

        [deployer, addr1, addr2, addr3] = await ethers.getSigners();

        STRIKE = await ethers.getContractFactory('Strike');
        strike = await STRIKE.deploy();

        Staking = await ethers.getContractFactory('StrikeStaking');
        staking = await Staking.deploy();

        Treasury = await ethers.getContractFactory('MockTreasury');
        treasury = await Treasury.deploy();

        // CalculateEpoch = await ethers.getContractFactory('CalculateEpoch');
        // calculateEpoch = await CalculateEpoch.deploy();

        //await treasury.setStakingAndSTRIKE(staking.address, strike.address);

        await strike.mint(treasury.address, 9000000000000000);

        sSTRIKE = await ethers.getContractFactory('sStrike');
        sstrike = await sSTRIKE.deploy(staking.address);

        await staking.initialize( strike.address, sstrike.address, treasury.address, '1642546800');
        await staking.transferOwnership(treasury.address)
        //await sstrike.setMonetaryPolicy(staking.address);
        // await calculateEpoch.setTreasury(treasury.address)
        tokenAmount = '1000000000'
        await strike.mint(deployer.address, '10000000000000');
        await strike.mint(addr1.address, '10000000000000000');
        // await strike.mint(addr3.address, 1000000000000000);

        await strike.transferOwnership(treasury.address);

        nonce = await strike.nonces(deployer.address)
        nonceAddr1 = await strike.nonces(addr1.address);

        deadline = ethers.constants.MaxUint256

        domain = {
            name: await strike.name(),
            version:'1',
            chainId: deployer.provider._network.chainId,
            verifyingContract: strike.address.toString()
        }

        domainAddr1 = {
            name: await strike.name(),
            version:'1',
            chainId: addr1.provider._network.chainId,
            verifyingContract: strike.address.toString()
        }

        types = {
            Permit: [
            {name: "owner", type: "address"},
            {name: "spender", type: "address"},
            {name: "value", type: "uint256"},
            {name: "nonce", type: "uint256"},
            {name: "deadline", type: "uint256"},
            ]
        }

        val = {
            'owner': deployer.address.toString(),
            'spender': staking.address.toString(),
            'value': 1000000000,
            'nonce': nonce.toString(),
            'deadline': deadline.toString()
        }

        valAddr1 = {
            'owner': addr1.address.toString(),
            'spender': staking.address.toString(),
            'value': 3000000000,
            'nonce': nonceAddr1.toString(),
            'deadline': deadline.toString()
        }

        const signer = ethers.provider.getSigner() // owner is 0 and should be the signer
        const signature = await signer._signTypedData(domain, types, val)
        sig = ethers.utils.splitSignature(signature);

        const signerAddr1 = ethers.provider.getSigner(1);
        const signatureAddr1 = await signerAddr1._signTypedData(domainAddr1, types, valAddr1)
        sigAddr1 = ethers.utils.splitSignature(signatureAddr1);
        

    });
        
    describe('stakeSTRIKE()', () => {
        it('should transfer sSTRIKE from staking contract to staker when stake is made', async () => {
            expect(await sstrike.balanceOf(deployer.address)).to.equal(0);
            await staking.stakeSTRIKE(tokenAmount, deadline,  sig.v, sig.r, sig.s);
            expect(await sstrike.balanceOf(deployer.address)).to.equal(1000000000);
        });

        it('should not let a user stake if they are not the proper signer', async () => {
            const _nonce = await strike.nonces(deployer.address);

            const _domain = {
                name: await strike.name(),
                version:'1',
                chainId: deployer.provider._network.chainId,
                verifyingContract: strike.address.toString()
            }

            const _val = {
                'owner': deployer.address.toString(),
                'spender': staking.address.toString(),
                'value': '500000000',
                'nonce': _nonce.toString(),
                'deadline': deadline.toString()
            }

            const signer = ethers.provider.getSigner() 
            const signature = await signer._signTypedData(_domain, types, _val)
            const _sig = ethers.utils.splitSignature(signature);

            await expect(staking.connect(addr1).stakeSTRIKE('500000000', deadline,  _sig.v, _sig.r, _sig.s)).to.be.revertedWith("revert ZeroSwapPermit: Invalid signature")

            await staking.stakeSTRIKE('500000000', deadline,  _sig.v, _sig.r, _sig.s);

        });

        it('should not let a user stake more than they have', async () => {
            val = {
                'owner': deployer.address.toString(),
                'spender': staking.address.toString(),
                'value': '10000000000000001',
                'nonce': nonce.toString(),
                'deadline': deadline.toString()
            }

            const signer = ethers.provider.getSigner() // owner is 0 and should be the signer
            const signature = await signer._signTypedData(domain, types, val)
            sig = ethers.utils.splitSignature(signature);

            await expect(staking.stakeSTRIKE('10000000000000001', deadline,  sig.v, sig.r, sig.s)).to.be.revertedWith("transfer amount exceeds balance");
            expect(await sstrike.balanceOf(deployer.address)).to.equal(0);
            expect(await strike.balanceOf(deployer.address)).to.equal('10000000000000');

            
        });

        it('should not distribute profits after the first epoch', async () => {
            await staking.stakeSTRIKE(tokenAmount, deadline,  sig.v, sig.r, sig.s);
            expect(await sstrike.balanceOf(deployer.address)).to.equal(tokenAmount);

            console.log("Staking address is : " + staking.address);

            await treasury.sendSTRIKEProfits(2000000000);
            expect(await sstrike.balanceOf(deployer.address)).to.equal(tokenAmount);
        });

        it('should distirbute profits correctly if someone stakes after epoch', async () => {
            await staking.stakeSTRIKE(tokenAmount, deadline,  sig.v, sig.r, sig.s);

            await treasury.sendSTRIKEProfits(2000000000);
            await staking.connect(addr1).stakeSTRIKE(3000000000, deadline,  sigAddr1.v, sigAddr1.r, sigAddr1.s);
            expect(await sstrike.balanceOf(deployer.address)).to.equal(tokenAmount);
            expect(await sstrike.balanceOf(addr1.address)).to.equal(3000000000);

            await treasury.sendSTRIKEProfits(1000000000);

            expect(await sstrike.balanceOf(deployer.address)).to.equal(1500000000);
            expect(await sstrike.balanceOf(addr1.address)).to.equal(4500000000);
        });

        it('should transfer STRIKE from staker to staking contract when stake is made', async () => {
            const balanceBefore = await strike.balanceOf(deployer.address);

            await staking.stakeSTRIKE(tokenAmount, deadline,  sig.v, sig.r, sig.s);

            const balanceAfter = await strike.balanceOf(deployer.address);

            expect(balanceAfter).to.equal(balanceBefore - tokenAmount);
        });

        it('should add sSTRIKE to circulating supply when stake is made', async () => {            
            expect(await sstrike.circulatingSupply()).to.equal(0);

            await staking.stakeSTRIKE(tokenAmount, deadline,  sig.v, sig.r, sig.s);
            expect(await sstrike.circulatingSupply()).to.equal(tokenAmount);
        });

        it('should rebase a single user correctly when profits are distributed', async () => {
            await staking.stakeSTRIKE(tokenAmount, deadline,  sig.v, sig.r, sig.s);

            await treasury.sendSTRIKEProfits(2000000000);
            await treasury.sendSTRIKEProfits(1000000000);
            expect(await sstrike.balanceOf(deployer.address)).to.equal(+2000000000 + +tokenAmount);
        });

        it('should add circulating supply correctly when a rebase is made to distribute profits', async () => {
            await staking.stakeSTRIKE(tokenAmount, deadline,  sig.v, sig.r, sig.s);

            await treasury.sendSTRIKEProfits(2000000000);
            await treasury.sendSTRIKEProfits(1000000000);
            expect(await sstrike.circulatingSupply()).to.equal(+2000000000 + +tokenAmount);
        });

        it('should rebase multiple users correctly when profits are distributed', async () => {
            await staking.stakeSTRIKE(tokenAmount, deadline,  sig.v, sig.r, sig.s);
            await staking.connect(addr1).stakeSTRIKE(3000000000, deadline,  sigAddr1.v, sigAddr1.r, sigAddr1.s);

            await treasury.sendSTRIKEProfits(3000000000);
            await treasury.sendSTRIKEProfits(1000000000);  
            expect(await sstrike.balanceOf(deployer.address)).to.equal(1750000000);
            expect(await sstrike.balanceOf(addr1.address)).to.equal(5250000000);
        });

        it('should add circualting supply correctly when multiple users are distributed profits', async () => {
            await staking.stakeSTRIKE(tokenAmount, deadline,  sig.v, sig.r, sig.s);
            await staking.connect(addr1).stakeSTRIKE(3000000000, deadline,  sigAddr1.v, sigAddr1.r, sigAddr1.s);

            await treasury.sendSTRIKEProfits(3000000000);
            await treasury.sendSTRIKEProfits(1000000000);
            expect(await sstrike.circulatingSupply()).to.equal(7000000000);
        });

        it('should pass if there is profit and no staker', async () => {
            const totalSupplyBefore = await sstrike.totalSupply();
            await treasury.sendSTRIKEProfits(3000000000);

            const totalSupplyAfter1 = await sstrike.totalSupply();  
            expect(totalSupplyBefore).to.equal(totalSupplyAfter1);

            await treasury.sendSTRIKEProfits(3000000000);

            const totalSupplyAfter2 = await sstrike.totalSupply();  
            expect(totalSupplyAfter2).to.equal(totalSupplyBefore.toNumber() + 3000000000);
        });

        it('should NOT add to circulating supply if there is profit and no stakers', async () => {
            const circulatingSupplyBefore = await sstrike.circulatingSupply();
            expect(circulatingSupplyBefore).to.equal(0);

            await treasury.sendSTRIKEProfits(3000000000);
            const circulatingSupplyAfter1 = await sstrike.circulatingSupply(); 
            expect(circulatingSupplyAfter1).to.equal(0);

            await treasury.sendSTRIKEProfits(3000000000);
            const circulatingSupplyAfter2 = await sstrike.circulatingSupply(); 
            expect(circulatingSupplyAfter2).to.equal(0);
        });

        it('should work properly if profit is over 10000000000000000', async () => {
            await staking.stakeSTRIKE(tokenAmount, deadline,  sig.v, sig.r, sig.s);
            await treasury.sendSTRIKEProfits("19000000000000000");
            await treasury.sendSTRIKEProfits("19000000000000000");

            expect(await sstrike.balanceOf(deployer.address)).to.equal("19000001000000000");
        });
    
    });

    describe('unstakeSTRIKE()', () => {
        it('should transfer sSTRIKE from unstaker to staking contract when user unstakes', async () => {
            await staking.stakeSTRIKE(tokenAmount, deadline,  sig.v, sig.r, sig.s);
            expect(await sstrike.balanceOf(deployer.address)).to.equal(1000000000);

            const _nonce = await sstrike.nonces(deployer.address);

            const _domain = {
                name: await sstrike.name(),
                version:'1',
                chainId: deployer.provider._network.chainId,
                verifyingContract: sstrike.address.toString()
            }

            const _val = {
                'owner': deployer.address.toString(),
                'spender': staking.address.toString(),
                'value': '500000000',
                'nonce': _nonce.toString(),
                'deadline': deadline.toString()
            }

            const signer = ethers.provider.getSigner() 
            const signature = await signer._signTypedData(_domain, types, _val)
            const _sig = ethers.utils.splitSignature(signature);

            await staking.unstakeSTRIKE('500000000', deadline, _sig.v, _sig.r, _sig.s);
            expect(await sstrike.balanceOf(deployer.address)).to.equal('500000000');

            const _nonce2 = await sstrike.nonces(deployer.address);

            const _domain2 = {
                name: await sstrike.name(),
                version:'1',
                chainId: deployer.provider._network.chainId,
                verifyingContract: sstrike.address.toString()
            }

            const _val2 = {
                'owner': deployer.address.toString(),
                'spender': staking.address.toString(),
                'value': '500000000',
                'nonce': _nonce2.toString(),
                'deadline': deadline.toString()
            }

            const signer2 = ethers.provider.getSigner() 
            const signature2 = await signer2._signTypedData(_domain2, types, _val2)
            
            const _sig2 = ethers.utils.splitSignature(signature2);

            await staking.unstakeSTRIKE(500000000, deadline, _sig2.v, _sig2.r, _sig2.s);
            expect(await sstrike.balanceOf(deployer.address)).to.equal(0);
        });

        it('should transfer STRIKE back to user when they unstake', async () => {
            await staking.stakeSTRIKE(tokenAmount, deadline,  sig.v, sig.r, sig.s);
            const balanceAfter = await strike.balanceOf(deployer.address);

            const _nonce = await sstrike.nonces(deployer.address);

            const _domain = {
                name: await sstrike.name(),
                version:'1',
                chainId: deployer.provider._network.chainId,
                verifyingContract: sstrike.address.toString()
            }

            const _val = {
                'owner': deployer.address.toString(),
                'spender': staking.address.toString(),
                'value': '500000000',
                'nonce': _nonce.toString(),
                'deadline': deadline.toString()
            }

            const signer = ethers.provider.getSigner() 
            const signature = await signer._signTypedData(_domain, types, _val)
            const _sig = ethers.utils.splitSignature(signature);

            await staking.unstakeSTRIKE('500000000', deadline, _sig.v, _sig.r, _sig.s);
            expect(await strike.balanceOf(deployer.address)).to.equal(+balanceAfter.toNumber() + +500000000);

            const _nonce2 = await sstrike.nonces(deployer.address);

            const _domain2 = {
                name: await sstrike.name(),
                version:'1',
                chainId: deployer.provider._network.chainId,
                verifyingContract: sstrike.address.toString()
            }

            const _val2 = {
                'owner': deployer.address.toString(),
                'spender': staking.address.toString(),
                'value': '500000000',
                'nonce': _nonce2.toString(),
                'deadline': deadline.toString()
            }

            const signer2 = ethers.provider.getSigner() 
            const signature2 = await signer2._signTypedData(_domain2, types, _val2)
            
            const _sig2 = ethers.utils.splitSignature(signature2);

            await staking.unstakeSTRIKE(500000000, deadline, _sig2.v, _sig2.r, _sig2.s);
            expect(await strike.balanceOf(deployer.address)).to.equal(balanceAfter.toNumber() + 1000000000);
        });

        it('should remove sSTRIKE from circulating supply when unstake is made', async () => {            
            expect(await sstrike.circulatingSupply()).to.equal(0);

            await staking.stakeSTRIKE(tokenAmount, deadline,  sig.v, sig.r, sig.s);
            expect(await sstrike.circulatingSupply()).to.equal(1000000000);

            const _nonce = await sstrike.nonces(deployer.address);

            const _domain = {
                name: await sstrike.name(),
                version:'1',
                chainId: deployer.provider._network.chainId,
                verifyingContract: sstrike.address.toString()
            }

            const _val = {
                'owner': deployer.address.toString(),
                'spender': staking.address.toString(),
                'value': '500000000',
                'nonce': _nonce.toString(),
                'deadline': deadline.toString()
            }

            const signer = ethers.provider.getSigner() 
            const signature = await signer._signTypedData(_domain, types, _val)
            const _sig = ethers.utils.splitSignature(signature);

            await staking.unstakeSTRIKE('500000000', deadline, _sig.v, _sig.r, _sig.s);
            expect(await sstrike.circulatingSupply()).to.equal(500000000);

            const _nonce2 = await sstrike.nonces(deployer.address);

            const _domain2 = {
                name: await sstrike.name(),
                version:'1',
                chainId: deployer.provider._network.chainId,
                verifyingContract: sstrike.address.toString()
            }

            const _val2 = {
                'owner': deployer.address.toString(),
                'spender': staking.address.toString(),
                'value': '500000000',
                'nonce': _nonce2.toString(),
                'deadline': deadline.toString()
            }

            const signer2 = ethers.provider.getSigner() 
            const signature2 = await signer2._signTypedData(_domain2, types, _val2)
            
            const _sig2 = ethers.utils.splitSignature(signature2);

            await staking.unstakeSTRIKE(500000000, deadline, _sig2.v, _sig2.r, _sig2.s);
            expect(await sstrike.circulatingSupply()).to.equal(0);
        });

        it('shoud NOT let a user unstake more than they have', async () => {
            await staking.stakeSTRIKE(tokenAmount, deadline,  sig.v, sig.r, sig.s);

            const _nonce = await sstrike.nonces(deployer.address);

            const _domain = {
                name: await sstrike.name(),
                version:'1',
                chainId: deployer.provider._network.chainId,
                verifyingContract: sstrike.address.toString()
            }

            const _val = {
                'owner': deployer.address.toString(),
                'spender': staking.address.toString(),
                'value': '1000000001',
                'nonce': _nonce.toString(),
                'deadline': deadline.toString()
            }

            const signer = ethers.provider.getSigner() 
            const signature = await signer._signTypedData(_domain, types, _val)
            const _sig = ethers.utils.splitSignature(signature);
            
            await expect(staking.unstakeSTRIKE(1000000001, deadline, _sig.v, _sig.r, _sig.s)).to.be.revertedWith("revert SafeMath: subtraction overflow");
        });

        it('should not let a user unstake if they are not the approved signer', async () => {
            await staking.stakeSTRIKE(tokenAmount, deadline,  sig.v, sig.r, sig.s);
            await staking.connect(addr1).stakeSTRIKE(3000000000, deadline,  sigAddr1.v, sigAddr1.r, sigAddr1.s);

            const _nonce = await sstrike.nonces(deployer.address);

            const _domain = {
                name: await sstrike.name(),
                version:'1',
                chainId: deployer.provider._network.chainId,
                verifyingContract: sstrike.address.toString()
            }

            const _val = {
                'owner': deployer.address.toString(),
                'spender': staking.address.toString(),
                'value': tokenAmount,
                'nonce': _nonce.toString(),
                'deadline': deadline.toString()
            }

            const signer = ethers.provider.getSigner() 
            const signature = await signer._signTypedData(_domain, types, _val)
            const _sig = ethers.utils.splitSignature(signature);

            await expect(staking.connect(addr1).stakeSTRIKE(tokenAmount, deadline,  _sig.v, _sig.r, _sig.s)).to.be.revertedWith("revert ZeroSwapPermit: Invalid signature");

            await staking.unstakeSTRIKE(tokenAmount, deadline, _sig.v, _sig.r, _sig.s);

        });

    });

    describe('distributeSTRIKEProfits()', () => {
        it('should NOT let non owner distribute', async () => {
            await expect(staking.distributeSTRIKEProfits()).to.be.revertedWith("caller is not the owner");
        });

    });

});