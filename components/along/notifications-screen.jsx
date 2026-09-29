'use client';

import {
  Bell,
  CheckCheck,
  MessageCircle,
  UserRoundPlus,
  CircleCheck,
  CalendarX2,
  MapPinCheck,
  Flag,
  Trash2
} from 'lucide-react';
import { useAlong } from './context';

const icons = {
  join_request: UserRoundPlus,
  request_accepted: CircleCheck,
  message: MessageCircle,
  plan_closed: CalendarX2,
  check_in: MapPinCheck,
  plan_completed: CircleCheck,
  report: Flag
};
const tones = {
  join_request: 'bg-[#fff2df] text-[#9b6415]',
  request_accepted: 'bg-[#e7f5e9] text-[#3b793f]',
  message: 'bg-[#fce9f3] text-[#b43075]',
  plan_closed: 'bg-[#f3eee9] text-[#765c4b]',
  check_in: 'bg-[#e7f5e9] text-[#3b793f]',
  plan_completed: 'bg-[#e9f1e8] text-[#2f5d34]',
  report: 'bg-[#fff2f7] text-[#9f2849]'
};

function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('en-UG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
}

export function NotificationsScreen() {
  const {
    notifications,
    notificationError,
    refreshNotifications,
    viewer,
    openNotification,
    readAllNotifications,
    deleteNotification,
    clearNotifications
  } = useAlong();
  const unread = notifications.filter((item) => !item.read_at).length;

  return (
    <section className='mx-auto max-w-3xl pb-10'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <p className='mb-2 text-xs font-extrabold uppercase tracking-[.16em] text-[#b43075]'>
            Your updates
          </p>
          <h1 className='font-heading text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-tight tracking-[-.045em]'>
            Notifications<span className='text-[#ec4899]'>.</span>
          </h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            The plans and people that need your attention.
          </p>
        </div>
        {notifications.length > 0 && (
          <div className='flex flex-wrap gap-2'>
            {unread > 0 && (
              <button
                type='button'
                onClick={readAllNotifications}
                className='inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d9e5d7] bg-white px-4 text-sm font-bold text-[#3b793f] hover:bg-[#e9f1e8]'
              >
                <CheckCheck className='size-4' /> Mark all read
              </button>
            )}
            <button
              type='button'
              onClick={clearNotifications}
              className='inline-flex min-h-10 items-center gap-2 rounded-full border border-[#e4c9d2] bg-white px-4 text-sm font-bold text-[#9f2849] hover:bg-[#fff2f7]'
            >
              <Trash2 className='size-4' /> Clear all
            </button>
          </div>
        )}
      </div>
      {notificationError && (
        <div
          role='alert'
          className='mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f4c5d8] bg-[#fff2f7] p-4 text-sm text-[#9f2849]'
        >
          <span>{notificationError}</span>
          <button
            type='button'
            onClick={() => refreshNotifications(viewer.id)}
            className='font-bold underline'
          >
            Try again
          </button>
        </div>
      )}
      {notifications.length ? (
        <div className='mt-8 overflow-hidden rounded-[22px] border border-[#dee7dc] bg-white'>
          {notifications.map((item) => {
            const Icon = icons[item.kind] || Bell;
            return (
              <div
                key={item.id}
                className={`flex items-start gap-2 border-b border-[#e7ece5] last:border-b-0 ${item.read_at ? '' : 'bg-[#fbfdf9]'}`}
              >
                <button
                  type='button'
                  onClick={() => openNotification(item)}
                  className='flex min-w-0 flex-1 items-start gap-4 px-5 py-5 text-left transition hover:bg-[#f7faf5]'
                >
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tones[item.kind] || 'bg-[#e9f1e8] text-[#3b793f]'}`}
                  >
                    <Icon className='size-5' />
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='flex items-start justify-between gap-3'>
                      <strong className='font-heading text-base font-extrabold text-forest'>
                        {item.title}
                      </strong>
                      {!item.read_at && (
                        <span
                          className='mt-1.5 size-2.5 shrink-0 rounded-full bg-[#ec4899]'
                          aria-label='Unread'
                        />
                      )}
                    </span>
                    <span className='mt-1 block text-sm leading-relaxed text-[#586b5d]'>
                      {item.body}
                    </span>
                    <time
                      className='mt-2 block text-xs font-semibold text-[#7a897c]'
                      dateTime={item.created_at}
                    >
                      {dateLabel(item.created_at)}
                    </time>
                  </span>
                </button>
                <button
                  type='button'
                  aria-label={`Delete notification: ${item.title}`}
                  onClick={() => deleteNotification(item.id)}
                  className='mt-4 mr-3 grid size-10 shrink-0 place-items-center rounded-xl text-[#8a9a8c] hover:bg-[#fff2f7] hover:text-[#9f2849] focus-visible:outline-2 focus-visible:outline-primary'
                >
                  <Trash2 className='size-4' />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        !notificationError && (
          <div className='mt-8 rounded-[24px] border border-[#dfe8dc] bg-white px-7 py-14 text-center'>
            <span className='mx-auto grid size-16 place-items-center rounded-[20px] bg-[#fff3dc] text-[#a86e17]'>
              <Bell className='size-7' />
            </span>
            <h2 className='mt-5 font-heading text-xl font-extrabold text-forest'>
              All quiet for now
            </h2>
            <p className='mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#607061]'>
              Join requests, messages, check-ins, and completed plans will appear here.
            </p>
          </div>
        )
      )}
    </section>
  );
}
