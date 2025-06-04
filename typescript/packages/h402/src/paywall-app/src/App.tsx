import {Suspense, useEffect, useState} from 'react'
import {SelectedWalletAccountContextProvider} from '@/solana/context/SelectedWalletAccountContextProvider'
import LoadingState from '@/components/LoadingState'
import Paywall from '@/components/Paywall'
import {ThemeProvider} from '@/components/ThemeProvider'
import {ThemeToggle} from '@/components/ThemeToggle'
import {imageGenerationPaymentRequirements} from '@/config/paymentRequirements'
import type {EnrichedPaymentRequirements} from "../../types";
import { EvmWalletProvider } from './evm/context/EvmWalletContext'

function App() {
  const [paymentRequirements, setPaymentRequirements] = useState<EnrichedPaymentRequirements[]>([])

  useEffect(() => {
    setPaymentRequirements(window.h402?.paymentRequirements ?? [])
  }, [])

  if (imageGenerationPaymentRequirements && !paymentRequirements) {
    return <LoadingState message="Loading Payment Options"/>
  }

  return (
    <ThemeProvider defaultTheme="system">
      <EvmWalletProvider>
        <SelectedWalletAccountContextProvider>
          <div className="w-dvw h-dvh text-black dark:text-white font-geist-sans antialiased">
            <header className="flex justify-between items-center -mb-20 mr-2 px-4 pt-4">
              <div className="text-2xl font-bold text-white"></div>
              <div className="flex gap-4 items-center">
                <ThemeToggle/>
                <a
                  href="https://bitgpt.xyz/discord"
                  className="text-foreground px-4 py-2 rounded-full font-medium border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join Community
                </a>
                <a
                  href="https://github.com/bit-gpt/h402"
                  className="bg-[#2E74FF] hover:bg-[#2361DB] dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-full font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
              </div>
            </header>

            <main className="min-h-screen flex items-center justify-center">
              <div className="w-full max-w-[800px] mx-auto p-8">
                <h1 className="text-2xl font-semibold mb-2">
                  Complete Payment to Continue
                </h1>

                <p className="text-gray-500 dark:text-gray-400 text-base mb-8">
                  Connect your wallet and pay a small fee to generate your AI image.
                </p>

                <Suspense fallback={<LoadingState/>}>
                  <Paywall paymentRequirements={paymentRequirements}/>
                </Suspense>
              </div>
            </main>
          </div>
        </SelectedWalletAccountContextProvider>
      </EvmWalletProvider>
    </ThemeProvider>
  )
}

export default App
