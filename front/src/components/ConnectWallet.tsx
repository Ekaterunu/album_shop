import React from "react";
import NetworkErrorMessage from "./NetworkErrorMessage";

type ConnectWalletProps = {
  connectWallet: React.MouseEventHandler<HTMLButtonElement>;
  dismiss: React.MouseEventHandler<HTMLButtonElement>;
  networkError: string | undefined;
};

const ConnectWallet: React.FunctionComponent<ConnectWalletProps> = ({
  connectWallet,
  networkError,
  dismiss,
}) => {
  return (
    <>
    <div className="p-8 connectWalletDiv">
      <div>
        {networkError && (
          <NetworkErrorMessage message={networkError} dismiss={dismiss} />
        )}
      </div>
      <div className="connectWalletInfoData">
        <p className="mt-10 text-5xl connectWalletTitle pr-8">Добро пожаловать </p>
      </div>
      <p className="mt-5 text-5xl connectWalletTitle pr-8">Пожалуйста подключите Ваш аккаунт</p>
      <div className="pt-6">
        
        <button  className="buttonConnect  select-none font-sans font-bold text-center uppercase transition-all disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-xs py-3 px-6 rounded-lg shadow-gray-900/10 hover:shadow-gray-900/20 focus:opacity-[0.85] active:opacity-[0.85] active:shadow-none block w-full bg-blue-gray-900/10 text-blue-gray-900 shadow-none hover:scale-105 hover:shadow-none focus:scale-105 focus:shadow-none active:scale-100"
                      type="button" onClick={connectWallet}>
          Подключить кошелек
        </button>
        <div className="img-connect-bd"></div>
      </div>
    </div>
    </>
  );
};

export default ConnectWallet;