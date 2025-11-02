'use client';

import { useEffect, useState } from 'react';
import useSolana from '../hooks/useSolana';
import Head from 'next/head';
import axios from 'axios';
import { Notification } from './Notification';

interface NotificationProps {
    message: string | React.ReactNode;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

interface CurrentPresaleInfo {
    presaleIdentifier: number;
    tokenMintAddress: string | null;
    softcapAmount: number;
    hardcapAmount: number;
    depositTokenAmount: number;
    soldTokenAmount: number;

    startTime: number;
    endTime: number;
    maxTokenAmountPerAddress: number;
    minTokenAmountPerAddress: number;
    pricePerToken: number;
    isLive: boolean;
    isSoftCapped: boolean;
    isHardCapped: boolean;
    isInitialized: boolean;
}


export default function TokenTransfer() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [solPrice, setSolPrice] = useState(0);
    const [currentPresaleInfo, setCurrentPresaleInfo] = useState<CurrentPresaleInfo | null>(null);
    const [dbPresaleInfo, setDbPresaleInfo] = useState(null);

    const {
        presaleInfo,
        walletBalance,
        publicKey,
        holdingTokens,
        buyAndClaimToken,
        fetchPresaleInfo,
        fetchWalletBalance,
        fetchHoldingTokens,
        getCurrentPresaleFromDB,
        fetchPresaleInfoFromDB,
        presaleIdentifier
    } = useSolana();

    const setManualTokenAmount = (e) => {
        setTokenAmount(e.target.value);
    }

    const [solAmount, setSolAmount] = useState(0);
    const [tokenAmount, setTokenAmount] = useState(0);
    const [walletAddress, setWalletAddress] = useState("undefined");
    const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [progress, setProgress] = useState(0);
    const [email, setEmail] = useState('');
    const [currentPresaleNumber, setCurrentPresaleNumber] = useState(1);
    const [showNotification, setShowNotification] = useState<NotificationProps | null>(null);

    // Fetch wallet-specific data when wallet connects
    useEffect(() => {
        const fetchWalletData = async () => {
            if (!publicKey) {
                setWalletAddress("undefined");
                return;
            }

            try {
                setLoading(true);
                setWalletAddress(publicKey.toString());

                await Promise.all([
                    fetchWalletBalance(),
                    fetchHoldingTokens(),
                    (async () => {
                        const dbInfo = await fetchPresaleInfoFromDB();
                        setDbPresaleInfo(dbInfo);
                    })()
                ]);
            } catch (error) {
                console.error('Error fetching wallet data:', error);
                setShowNotification({
                    message: 'Failed to fetch wallet information',
                    type: 'error',
                    onClose: () => setShowNotification(null)
                });
            } finally {
                setLoading(false);
            }
        };

        fetchWalletData();
    }, [publicKey, fetchPresaleInfo, fetchPresaleInfoFromDB, fetchWalletBalance, fetchHoldingTokens]);

    // Fetch SOL price
    useEffect(() => {
        const fetchSolPrice = async () => {
            try {
                const response = await axios.get(
                    'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
                );
                setSolPrice(response.data.solana.usd);
            } catch (error) {
                console.error("Error fetching SOL price:", error);
                setShowNotification({
                    message: 'Failed to fetch SOL price',
                    type: 'error',
                    onClose: () => setShowNotification(null)
                });
            }
        };

        fetchSolPrice();
        const interval = setInterval(fetchSolPrice, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const handleBuy = async () => {
        if (!publicKey) {
            setShowNotification({
                message: "Please connect your wallet first",
                type: 'error',
                onClose: () => setShowNotification(null)
            });
            return;
        }

        try {
            setShowNotification({
                message: "Processing your purchase...",
                type: "info",
                onClose: () => setShowNotification(null)
            });

            const result = await buyAndClaimToken(tokenAmount, email, solAmount);

            if (result.success) {
                // Format signature to show first 4 and last 4 characters
                const formattedSignature = `${result.signature.slice(0, 4)}...${result.signature.slice(-4)}`;

                // Open Solscan when clicking the signature
                const openSolscan = () => {
                    window.open(`https://solscan.io/tx/${result.signature}`, '_blank');
                };

                setShowNotification(prevState => ({
                    message: (
                        <div>
                            Transaction successful! Signature:{' '}
                            <span
                                onClick={openSolscan}
                                className="cursor-pointer text-blue-500 hover:text-blue-700 underline"
                            >
                                {formattedSignature}
                            </span>
                        </div>
                    ),
                    type: 'success',
                    onClose: () => setShowNotification(null)
                }));

                // Refresh data
                await Promise.all([
                    fetchWalletBalance(),
                    fetchHoldingTokens(),
                    fetchPresaleInfo()
                ]);
            } else {
                throw new Error(result.error || "Unknown error occurred");
            }
        } catch (error) {
            console.error("Error buying tokens:", error);
            setShowNotification(prevState => ({
                message: error instanceof Error ? error.message : "Failed to purchase tokens",
                type: 'error',
                onClose: () => setShowNotification(null)
            }));
        }
    };

    const changeWalletAddress = () => {
        setShowNotification({
            message: "Cannot change wallet address manually. Please use a wallet connection.",
            type: 'error',
            onClose: () => setShowNotification(null)
        });
    };

    useEffect(() => {
        if (showNotification) {
            const timer = setTimeout(() => {
                setShowNotification(null);
            }, 5000); // Hide notification after 5 seconds

            return () => clearTimeout(timer);
        }
    }, [showNotification]);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">
            <div className="w-32 h-32 border-t-2 border-b-2 border-green-500 rounded-full animate-spin"></div>
        </div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-500">{error}</div>;
    }

    return (
        <div id="presalePanel" className="border-spacing-11 bg-gradient-to-b from-[#ffffff6e] to-[#4ef75770] my-5 flex flex-col items-center p-4 sm:p-6 rounded-xl shadow-lg w-[95%] max-w-3xl mx-auto">
            <Head>
                <meta name="description" content="Join the most promising meme coin of today!" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div className="font-bold animated-heading bg-[#2cc433]"><h1 className='text-5xl'>Presale</h1></div>
            <p className="mb-2 text-xl font-bold text-green-800 outline-cA font-roboto">Buy before the price goes up!</p>
            <div className="flex flex-col rounded-xl items-center bg-[#f7f7f7c4] shadow-md">
                <div className="flex px-4 space-x-2">
                    <div className="px-4 text-center text-green-800 rounded">
                        <span className="text-2xl font-bold">{timeRemaining.days}</span>
                        <div className="text-sm">days</div>
                    </div>
                    <div className="px-4 text-center text-green-800 rounded">
                        <span className="text-2xl font-bold">{timeRemaining.hours}</span>
                        <div className="text-sm">hours</div>
                    </div>
                    <div className="px-4 text-center text-green-800 rounded">
                        <span className="text-2xl font-bold">{timeRemaining.minutes}</span>
                        <div className="text-sm">min</div>
                    </div>
                    <div className="px-4 text-center text-green-800 rounded">
                        <span className="text-2xl font-bold">{timeRemaining.seconds}</span>
                        <div className="text-sm">sec</div>
                    </div>
                </div>
                <p className="text-sm text-center text-purple-700 ">{progress.toFixed(2)}% completed</p>
                <div className="w-full bg-gray-300 rounded-b-md">
                    <div
                        className={`h-4 rounded-bl-lg rounded-r-lg ${progress < 100 ? 'bg-orange-500' : 'bg-green-500'} progress-bar`}
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
            <div className="flex flex-col items-center w-full mt-4 px-2 sm:px-4">
                <label htmlFor="amount" className="block text-sm sm:text-base font-bold text-green-900 text-center">
                    Enter the amount in SOLANA (min : 0.0205SOL)
                </label>
                <label htmlFor="amount" className="block text-xs sm:text-sm font-bold text-purple-800 text-center">
                    Balance: <span className="mx-1 text-red-500">{walletBalance}</span> SOL
                </label>
                <label htmlFor="amount" className="block text-xs sm:text-sm font-bold text-purple-800 text-center">
                    Sol price is $<span className="mx-1 text-red-500">{solPrice}</span>
                </label>
                <div className="flex justify-end w-full mt-2">
                    <input
                        type="number"
                        id="tokenamount"
                        className="w-full px-2 py-1 text-sm sm:text-base text-green-900 bg-white border-2 border-yellow-400 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder="0"
                        value={tokenAmount}
                        onChange={setManualTokenAmount}
                    />
                    <button className="px-2 sm:px-4 text-sm sm:text-base text-white transition duration-300 bg-yellow-400 rounded-r-lg shadow-md hover:bg-yellow-500">
                        TMONK
                    </button>
                </div>
            </div>

            <div className="w-full mt-2 px-2 sm:px-4">
                <label htmlFor="email" className="block text-sm sm:text-base text-green-900">Your E-mail address:</label>
                <input
                    type="email"
                    id="email"
                    className="w-full p-1 text-sm sm:text-base text-green-800 rounded"
                    placeholder="your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>

            <div className="w-full mt-2 px-2 sm:px-4">
                <label htmlFor="solanaAddress" className="block text-sm sm:text-base text-green-800">Your SOLANA address:</label>
                <input
                    type="text"
                    id="solanaAddress"
                    value={walletAddress}
                    onChange={changeWalletAddress}
                    className="w-full p-1 text-sm sm:text-base text-green-800 rounded"
                    placeholder="your SOLANA address"
                />
            </div>

            <button
                className="px-6 py-2 mt-4 text-base sm:text-lg font-bold text-green-900 transition duration-300 bg-yellow-500 rounded-xl hover:bg-yellow-600 hover:text-green-900 w-[80%] sm:w-auto"
                onClick={handleBuy}>
                BUY $TMONK
            </button>

            {showNotification && (
                <Notification
                    message={showNotification.message}
                    type={showNotification.type}
                    onClose={() => setShowNotification(null)}
                />
            )}
        </div>
    );
}



