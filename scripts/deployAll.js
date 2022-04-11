// @dev. This script will deploy a fork of the Olympus V1.1 named Strike. It will deploy the whole ecosystem except for the LP tokens and their bonds. 
// This protocol is a test protocol designed to implement the concept of an Index of OHM forks

const { ethers } = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log('Deploying contracts with the account: ' + deployer.address);

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
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    // Large number for approval for gOHM and MIM
    const largeApproval = '100000000000000000000000000000000';

    // STABLECOIN bond BCV
    const mimBondBCV = '50';

    // gOHM bond BCV
    const gohmBondBCV = '20';

    const MockDAO = '';
    const developmentWallet = '';

    // Treasury assets
    const mim = '';
    const gOHM = '';
    const wMEMO = '';
    
    // Treasury asset pairs
    const gohmfraxDEXPair = '';
    const gohmstrikeDEXPair = '';
    const wmemostrikeDEXPair = '';

    
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

    // Deploy STRIKE
    const STRIKE = await ethers.getContractFactory('Strike');
    const strike = await INDEX.deploy();
    console.log('STRIKE address', strike.address);


    // Set vault
    await strike.setVault(deployer.address);
    console.log("strike set vault");
   
    // Mint strike to deployer and dev wallet
    await strike.mint(deployer.address, '72969757239988');
    await strike.mint(developmentWallet, '32031000000000');
    console.log("strike mint")

    // Deploy Reserve Calculator
    const StrikeReserveValueCalculator = await ethers.getContractFactory('StrikeReserveValueCalculator');
    const strikeReserveValueCalculator = await StrikeReserveValueCalculator.deploy();
    console.log('reserve calculator', strikeReserveValueCalculator.address);

    await strikeReserveValueCalculator.updateReserveTokenDetails( mim, zeroAddress, zeroAddress, zeroAddress, 10, true);
    await strikeReserveValueCalculator.updateReserveTokenDetails( gOHM, gohmfraxDEXPair, '0xd24c2ad096400b6fbcd2ad8b24e7acbc21a1da64', gOHM, 10, false);
    await strikeReserveValueCalculator.updateReserveTokenDetails( wMEMO, wmemostrikeDEXPair, mim, wMEMO, 10, false);

    // Deploy treasury
    //@dev changed function in treaury from 'valueOf' to 'valueOfToken'... solidity function was coflicting w js object property name
    const Treasury = await ethers.getContractFactory('StrikeTreasury'); 
    const treasury = await Treasury.deploy(strike.address, mim, gOHM, wMEMO, 0, strikeReserveValueCalculator.address);
    console.log('treasury', treasury.address);

    // Deploy bonding calc
    const StrikeBondingCalculator = await ethers.getContractFactory('StrikeBondingCalculator');
    const strikeBondingCalculator = await StrikeBondingCalculator.deploy( strike.address );
    console.log('bonding calc', strikeBondingCalculator.address);

    // Deploy staking distributor
    const Distributor = await ethers.getContractFactory('Distributor');
    const distributor = await Distributor.deploy(treasury.address, strike.address, epochLengthInBlocks, firstEpochBlock);
    console.log('distributor', distributor.address);

    // Deploy sSTRIKE
    const SSTRIKE = await ethers.getContractFactory('sStrike');
    const sSTRIKE = await SSTRIKE.deploy();
    console.log('sSTRIKE', sSTRIKE.address);

    // Deploy Staking
    const Staking = await ethers.getContractFactory('StrikeStaking');
    const staking = await Staking.deploy( strike.address, sSTRIKE.address, epochLengthInBlocks, firstEpochNumber, firstEpochBlock);
    console.log('staking', staking.address);

    // Deploy staking warmpup
    const StakingWarmpup = await ethers.getContractFactory('StakingWarmup');
    const stakingWarmup = await StakingWarmpup.deploy(staking.address, sSTRIKE.address);
    console.log('staking warmup', stakingWarmup.address);

    // Deploy staking helper
    const StakingHelper = await ethers.getContractFactory('StakingHelper');
    const stakingHelper = await StakingHelper.deploy(staking.address, strike.address);
    console.log('staking helper', stakingHelper.address);

    // Deploy MIM bond
    //@dev changed function call to Treasury of 'valueOf' to 'valueOfToken' in BondDepository due to change in Treausry contract
    const MIMBond = await ethers.getContractFactory('StrikeBondDepository');
    const mimBond = await MIMBond.deploy(strike.address, mim, treasury.address, MockDAO, zeroAddress);
    console.log('mimbond', mimBond.address);

    // Deploy Frax bond
    //@dev changed function call to Treasury of 'valueOf' to 'valueOfToken' in BondDepository due to change in Treausry contract
    const gOHMBond = await ethers.getContractFactory('StrikeBondDepositoryCustom');
    const gohmBond = await gOHMBond.deploy(strike.address, gOHM, gohmfraxDEXPair, mim, treasury.address, MockDAO);
  
    console.log('gohmbond', gohmBond.address);

    // Deploy Frax bond
    //@dev changed function call to Treasury of 'valueOf' to 'valueOfToken' in BondDepository due to change in Treausry contract
    const wMEMOBond = await ethers.getContractFactory('StrikeBondDepositoryCustom');
    const wmemoBond = await wMEMOBond.deploy(strike.address, wMEMO, gohmfraxDEXPair, mim, treasury.address, MockDAO);
  
    console.log('gohmbond', gohmBond.address);

    // queue and toggle DAI and Frax bond reserve depositor
    await treasury.queue('0', mimBond.address);
    await treasury.queue('0', gohmBond.address);
    await treasury.queue('0', wmemoBond.address);
    await treasury.toggle('0', mimBond.address, zeroAddress);
    await treasury.toggle('0', gohmBond.address, zeroAddress);
    await treasury.toggle('0', wmemoBond.address, zeroAddress);

    console.log('toggle');

    // Set DAI and Frax bond terms
    await mimBond.initializeBondTerms(mimBondBCV, '700', maxBondPayout, bondFee, maxBondDebt,intialBondDebt ,bondVestingLength);
    await gohmBond.initializeBondTerms(gohmBondBCV, '5', maxBondPayout, maxBondDebt, bondFee, intialBondDebt, bondVestingLength);
    await wmemoBond.initializeBondTerms(gohmBondBCV, '1', maxBondPayout, maxBondDebt, bondFee, intialBondDebt, bondVestingLength);

    console.log('initialize bond terms');

    // Set staking for DAI and Frax bond
    await mimBond.setStaking(staking.address, stakingHelper.address);
    await wmemoBond.setStaking(staking.address, stakingHelper.address);
    await gohmBond.setStaking(staking.address, stakingHelper.address);
    console.log('set staking');

    // Initialize sSTRIKE and set the STRIKE
    await sSTRIKE.initialize(staking.address);
    await sSTRIKE.setIndex(initialIndex);
    console.log('set sSTRIKE');

    // set distributor contract and warmup contract
    await staking.setContract('0', distributor.address);
    await staking.setContract('1', stakingWarmup.address);
    console.log('set contract staking');

    // Set treasury for OHM token
    await strike.setVault(treasury.address);
    console.log('set vault');

    // Add staking contract as distributor recipient
    await distributor.addRecipient(staking.address, initialRewardRate);
    console.log('add recipient');


    // queue and toggle reward manager
    await treasury.queue('8', distributor.address);
    await treasury.toggle('8', distributor.address, zeroAddress);
    console.log('toggle 1');

    // queue and toggle deployer reserve depositor
    await treasury.queue('0', deployer.address);
    await treasury.toggle('0', deployer.address, zeroAddress);
    console.log('toggle 2');

    // queue and toggle liquidity depositor
    await treasury.queue('4', deployer.address, );
    await treasury.toggle('4', deployer.address, zeroAddress);
    console.log('toggle 3');

    // queue and toggle reward manager
    await treasury.queue('8', gohmBond.address);
    await treasury.toggle('8', gohmBond.address, zeroAddress);
    console.log('toggle 4');

    // queue and toggle reward manager
    await treasury.queue('8', wmemoBond.address);
    await treasury.toggle('8', wmemoBond.address, zeroAddress);
    console.log('toggle 4');


    console.log( "STRIKE: " + strike.address );
    console.log( "MIM: "  );
    console.log( "gOHM: " );
    console.log( "Treasury: " + treasury.address );
    console.log( "Calc: " + strikeBondingCalculator.address );
    console.log( "Staking: " + staking.address );
    console.log( "sINDEX: " + sSTRIKE.address );
    console.log( "Distributor " + distributor.address);
    console.log( "Staking Warmup " + stakingWarmup.address);
    console.log( "Staking Helper " + stakingHelper.address);
    console.log("MIM Bond: " + mimBond.address);
    console.log("gOHM Bond: " + gohmBond.address);
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})
