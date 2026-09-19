export default function StatusBar() {
  return (
    <div className="flex items-center justify-between px-7 pt-4 pb-2 bg-white text-black text-xs font-semibold">
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor">
          <rect x="0" y="6" width="3" height="4" rx="0.5" />
          <rect x="4.5" y="4" width="3" height="6" rx="0.5" />
          <rect x="9" y="2" width="3" height="8" rx="0.5" />
          <rect x="13.5" y="0" width="3" height="10" rx="0.5" />
        </svg>
        <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
          <path d="M7 9.5a1 1 0 110-2 1 1 0 010 2zM3.5 6.5a4.95 4.95 0 017 0L9.5 5.5a3.5 3.5 0 00-5 0L3.5 6.5zM1.5 4.5a7.78 7.78 0 0111 0L11.5 3.5a6.25 6.25 0 00-9 0L1.5 4.5z" />
        </svg>
        <div className="flex items-center">
          <div className="w-6 h-3 border border-black rounded-[3px] relative">
            <div
              className="absolute inset-0.5 bg-black rounded-[1px]"
              style={{ width: '75%' }}
            ></div>
          </div>
          <div className="w-0.5 h-1.5 bg-black rounded-r ml-0.5"></div>
        </div>
      </div>
    </div>
  );
}
