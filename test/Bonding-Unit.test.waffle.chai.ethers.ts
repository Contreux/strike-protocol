
import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { expect } from "chai";
import { Contract } from "ethers";
import { Address } from "cluster";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe('BondingTest', () => {


    let
      // Used as default deployer for contracts, asks as owner of contracts.
      deployer: SignerWithAddress,
      dao,
      addr1,
      treasury: Contract,
      strikeBondingCalculator: Contract,
      strikeReserveValueCalculator: Contract,
      staking: Contract,
      stakingWarmup: Contract,
      stakingHelper: Contract,
      mimBond: Contract,
      distributor: Contract,
      mockPair: Contract,
      mockBonding: Contract,
      strike: Contract,
      sSTRIKE: Contract,
      mim: Contract,
      zeroAddress,
      gOHM,
      wMEMO

    beforeEach(async () => {

         // Initial staking index
         const initialIndex = '1000000000';

         // First block epoch occurs in seconds 
         const firstEpochBlock = '1642546800';
                              
         // What epoch will be first epoch
         const firstEpochNumber = '1';

         // How many blocks are in each epoch
         const epochLengthInBlocks = '28800';

         // Initial reward rate for epoch
         const initialRewardRate = '5000';

         // Ethereum 0 address, used when toggling changes in treasury
         zeroAddress = '0x0000000000000000000000000000000000000000';

         wMEMO = '0x0000000000000000000000000000000000000001';
         gOHM = '0x0000000000000000000000000000000000000002';

         dao = '0x0000000000000000000000000000000000000003';

         // Large number for approval for gOHM and MIM
         const largeApproval = '100000000000000000000000000000000';

         // STABLECOIN bond BCV
         const mimBondBCV = '50';

        // Bond vesting length in blocks. 33110 ~ 5 days
        const bondVestingLength = '432000';

        // Min bond price
        const minBondPrice = '700';

        // Max bond payout
        const maxBondPayout = '3000';

        // DAO fee for bond
        const bondFee = '30000';

        // Max debt bond can take on
        const maxBondDebt = '16000000000000000';

        // Initial Bond debt
        const intialBondDebt = '0';



         [deployer, addr1, dao] = await ethers.getSigners();


         // Deploy STRIKE
         const STRIKE = await ethers.getContractFactory('Strike');
         strike = await STRIKE.deploy();

         // Set vault
         await strike.setVault(deployer.address);

         // Mint strike to deployer
         await strike.mint(deployer.address, '100000000');


         // Deploy MIM
         const MIM = await ethers.getContractFactory('MIM');
         mim = await MIM.deploy(31337);

         
         // Deploy Reserve Calculator
         const StrikeReserveValueCalculator = await ethers.getContractFactory('StrikeReserveValueCalculator');
         strikeReserveValueCalculator = await StrikeReserveValueCalculator.deploy();

         await strikeReserveValueCalculator.updateReserveTokenDetails( mim.address, zeroAddress, zeroAddress, zeroAddress, 10, true);
         //await strikeReserveValueCalculator.updateReserveTokenDetails( gOHM, gohmfraxDEXPair, '0xd24c2ad096400b6fbcd2ad8b24e7acbc21a1da64', gOHM, 10, false);
         //await strikeReserveValueCalculator.updateReserveTokenDetails( wMEMO, wmemostrikeDEXPair, mim, wMEMO, 10, false);
         

         // Deploy treasury
         const Treasury = await ethers.getContractFactory('StrikeTreasury'); 
         treasury = await Treasury.deploy(strike.address, mim.address, gOHM, wMEMO, 0, strikeReserveValueCalculator.address);

         // Mint MIM
         await mim.mint(treasury.address, '100000000000000000000000000000000');

         // Deploy bonding calc
         const StrikeBondingCalculator = await ethers.getContractFactory('StrikeBondingCalculator');
         strikeBondingCalculator = await StrikeBondingCalculator.deploy( strike.address );


         // Deploy staking distributor
         const Distributor = await ethers.getContractFactory('Distributor');
         distributor = await Distributor.deploy(treasury.address, strike.address, epochLengthInBlocks, firstEpochBlock);


         // Deploy sSTRIKE
         const SSTRIKE = await ethers.getContractFactory('sStrike');
         sSTRIKE = await SSTRIKE.deploy();


         // Deploy Staking
         const Staking = await ethers.getContractFactory('StrikeStaking');
         staking = await Staking.deploy( strike.address, sSTRIKE.address, epochLengthInBlocks, firstEpochNumber, firstEpochBlock);


         // Deploy staking warmpup
         const StakingWarmpup = await ethers.getContractFactory('StakingWarmup');
         stakingWarmup = await StakingWarmpup.deploy(staking.address, sSTRIKE.address);


         // Deploy staking helper`
         const StakingHelper = await ethers.getContractFactory('StakingHelper');
         stakingHelper = await StakingHelper.deploy(staking.address, strike.address);


         // Deploy MIM bond
         //@dev changed function call to Treasury of 'valueOf' to 'valueOfToken' in BondDepository due to change in Treausry contract
         const MIMBond = await ethers.getContractFactory('StrikeBondDepository');
         mimBond = await MIMBond.deploy(strike.address, mim.address, treasury.address, dao.address, zeroAddress);


         await mim.mint(deployer.address, '10000000000000000000000');
         await mim.mint(treasury.address, '10000000000000000000000');
         await strike.approve(stakingHelper.address, '99999999999999999999999999999');

         await treasury.queue('0', mimBond.address);
         await treasury.toggle('0', mimBond.address, zeroAddress);

         await mimBond.initializeBondTerms(mimBondBCV, '700', maxBondPayout, bondFee, maxBondDebt,intialBondDebt ,bondVestingLength);
         await mimBond.setStaking(staking.address, stakingHelper.address);

         await sSTRIKE.initialize(staking.address);
         await sSTRIKE.setIndex(initialIndex);

         await staking.setContract('0', distributor.address);
         await staking.setContract('1', stakingWarmup.address);

         await strike.setVault(treasury.address);

         await distributor.addRecipient(staking.address, initialRewardRate);     
     
         // queue and toggle reward manager
         await treasury.queue('8', distributor.address);
         await treasury.toggle('8', distributor.address, zeroAddress);
     
         // queue and toggle deployer reserve depositor
         await treasury.queue('0', deployer.address);
         await treasury.toggle('0', deployer.address, zeroAddress);
     
         // queue and toggle liquidity depositor
         await treasury.queue('4', deployer.address, );
         await treasury.toggle('4', deployer.address, zeroAddress);

         await treasury.auditReserves();
      
    });

    describe('Staking', () => {
      it('should stake strike', async () => {
         const strikeBalance = await strike.balanceOf(deployer.address);
         expect(strikeBalance).to.above(100);
         console.log(strikeBalance);
         await stakingHelper.stake(strikeBalance, deployer.address);
         expect(strike.balanceOf(deployer.address)).to.equal(0);
       });

      // it('should transfer LPs to treasury', async () => {
      //   expect(await mockPair.balanceOf(treasury.address)).to.equal(0);
        
      //   await mockBonding.depositLPs('1000000', mockPair.address, '1000');
      //   expect(await mockPair.balanceOf(treasury.address)).to.equal('1000000');
      // });

      // it('should update the user\'s LP balance after transfer', async () => {
      //   let balanceBefore = await mockPair.balanceOf(deployer.address);
      //   await mockBonding.depositLPs('1000000', mockPair.address, '1000');
      //   let balanceAfter = await mockPair.balanceOf(deployer.address);

      //   expect(balanceAfter.toString()).to.equal((balanceBefore - 1000000).toString());
      // });

      // it('should mint interest to the proper accounts', async () => {
      //   await mockPair.transfer(addr1.address, '10000000000000000');
      //   expect(await oly.balanceOf(addr1.address)).to.equal('0');

      //   await mockBonding.connect(addr1).depositLPs('1000000', mockPair.address, '1000');
      //   expect(await oly.balanceOf(addr1.address)).to.equal('1000');
      // });

      // it('should add to the total supply when interest gets minted', async () => {
      //   let totalSupplyBefore = await oly.totalSupply();
      //   await mockBonding.depositLPs('1000000', mockPair.address, '1000');
      //   let totalSupplyAfter = await oly.totalSupply();

      //   expect(totalSupplyAfter).to.equal(totalSupplyBefore.toNumber() + 1000);
      // });

      // it('should NOT let a user directly call transferLPsToTreasury', async () => {
        //await mockPair.approve(bondingFacilitator.address, '10000000000000000');
        //await bondingFacilitator.transferLPsToTreasury(deployer.address, mockPair.addresss, '1000', '100000' );
        //await expect(bondingFacilitator.transferLPsToTreasury(deployer.address, mockPair.addresss, '1000', '100000' )).to.be.revertedWith("Not bonding contract");
      // });

      // it('should add principle valuation', async () => {
      //   await mockBonding.depositLPs('55000000', mockPair.address, '1000');
      // });
    });

});