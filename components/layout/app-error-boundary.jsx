'use client';

import { Component } from 'react';
import Link from 'next/link';

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className='grid min-h-dvh place-items-center bg-[#f7f9f4] px-5 text-center text-forest'>
        <div className='max-w-md'>
          <h1 className='font-heading text-2xl font-extrabold'>Something went wrong</h1>
          <p className='mt-3 text-sm text-[#526756]'>
            This screen hit an unexpected error. You can try again or head back to explore.
          </p>
          <div className='mt-6 flex flex-wrap items-center justify-center gap-3'>
            <button
              type='button'
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              className='rounded-full bg-[#3b793f] px-6 py-3 font-bold text-white'
            >
              Reload
            </button>
            <Link href='/app/explore' className='rounded-full border border-[#3b793f] px-6 py-3 font-bold text-[#3b793f]'>
              Back to explore
            </Link>
          </div>
        </div>
      </main>
    );
  }
}
