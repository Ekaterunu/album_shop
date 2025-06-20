import React, { useState, useEffect } from "react";

type WaitingForTransactionMessageProps = {
  txHash: string;
};

const WaitingForTransactionMessage: React.FC<WaitingForTransactionMessageProps> = ({ txHash }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true); // если компонент монтируется заново с другим txHash
  }, [txHash]);

  if (!visible) return null;

  return (
    <div className="modal show">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h3 className="modal-title"></h3>
            <button className="close" onClick={() => setVisible(false)}>×</button>
          </div>
          <div className="modal-body">
            <p>
            Ожидание подтверждения транзакции: <strong>{txHash}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingForTransactionMessage;

    {/*<div>
      Waiting for transaction <strong>{txHash}</strong>
    </div>*/}