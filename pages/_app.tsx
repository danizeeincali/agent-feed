import { AppProps } from 'next/app';
import Head from 'next/head';
import '../frontend/src/index.css';
import '../frontend/src/styles/agents.css';
import '../frontend/src/styles/comments.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Agent Feed</title>
        <meta name="description" content="Agent Feed Application" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}