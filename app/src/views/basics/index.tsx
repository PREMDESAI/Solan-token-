
import { FC } from "react";
import { SignMessage } from '../../components/SignMessage';
import { TokenTransfer } from '../../components/TokenTransfer';
// import { SendTransaction } from '../../components/SendTransaction';
// import { SendVersionedTransaction } from '../../components/SendVersionedTransaction';


export const BasicsView: FC = ({ }) => {

  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        {/* CONTENT GOES HERE */}
        <div className="text-center">
          {/* <SignMessage /> */}
          {/* <SendTransaction />
          <SendVersionedTransaction /> */}
          <TokenTransfer />
        </div>
      </div>
    </div>
  );
};
