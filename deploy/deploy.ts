import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedArchive = await deploy("PhantomArchive", {
    from: deployer,
    log: true,
  });

  console.log(`PhantomArchive contract: `, deployedArchive.address);
};
export default func;
func.id = "deploy_phantomArchive"; // id required to prevent reexecution
func.tags = ["PhantomArchive"];
