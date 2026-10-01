export function Skeleton({ className = '' }) {
  return (
    <div
      aria-hidden='true'
      className={`animate-pulse rounded-xl bg-[#d8e5d9]/70 ${className}`}
    />
  );
}

export function AppShellSkeleton() {
  return (
    <div
      className='min-h-screen bg-background text-foreground'
      role='status'
      aria-live='polite'
      aria-busy='true'
    >
      <span className='sr-only'>Loading Tagwimi…</span>
      <div className='mx-auto grid max-w-[1440px] grid-cols-[248px_minmax(0,1fr)] max-[1050px]:grid-cols-[190px_minmax(0,1fr)] max-[760px]:block'>
        <aside className='sticky top-0 hidden h-screen flex-col border-r border-border px-3.5 pt-8 pb-6 max-[760px]:hidden min-[761px]:flex'>
          <Skeleton className='mb-8 h-9 w-36' />
          <div className='grid gap-2'>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className='h-12 w-full' />
            ))}
          </div>
          <div className='mt-auto border-t border-border pt-5'>
            <div className='flex items-center gap-3'>
              <Skeleton className='size-11 rounded-full' />
              <div className='grid flex-1 gap-2'>
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-3 w-36' />
              </div>
            </div>
          </div>
        </aside>
        <main className='min-w-0 px-12 pt-7 pb-20 max-[1050px]:px-6 max-[760px]:px-4 max-[760px]:pt-4'>
          <div className='mb-7 hidden justify-end max-[760px]:mb-4 min-[761px]:flex'>
            <Skeleton className='size-10' />
          </div>
          <Skeleton className='mb-3 h-4 w-28' />
          <Skeleton className='mb-3 h-12 w-64 max-w-full' />
          <Skeleton className='mb-8 h-4 w-80 max-w-full' />
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className='overflow-hidden rounded-[22px] border border-border bg-card'>
                <Skeleton className='h-40 w-full rounded-none' />
                <div className='grid gap-3 p-4'>
                  <Skeleton className='h-5 w-3/4' />
                  <Skeleton className='h-4 w-1/2' />
                  <Skeleton className='h-4 w-2/3' />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
