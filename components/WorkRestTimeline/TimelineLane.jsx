const FILL = {
  Work: 'bg-[#ffa940]',
  Rest: 'bg-[#73d13d]',
};

const NIGHT_ENDS = 8 * 4;
const NIGHT_STARTS = 20 * 4;
const isNight = (index) => index < NIGHT_ENDS || index >= NIGHT_STARTS;

export default function TimelineLane({ lane, blocks, columnsRef }) {
  return (
    <div className="flex h-[30px] border-b border-slate-300 last:border-b-0">
      <div className="flex w-16 shrink-0 items-center justify-center border-r border-slate-300 bg-white text-sm font-semibold">
        {lane}
      </div>

      <div ref={columnsRef} className="grid flex-1 grid-cols-[repeat(96,minmax(0,1fr))]">
        {blocks.map((state, index) => (
          <div
            key={index}
            title={`${lane} · block ${index}`}
            className={`h-full cursor-col-resize border-r ${
              state === lane ? FILL[lane] : isNight(index) ? 'bg-[#e9e9e9]' : 'bg-white'
            } ${index % 4 === 3 ? 'border-[#999999]' : 'border-[#cccccc]'}`}
          />
        ))}
      </div>
    </div>
  );
}
