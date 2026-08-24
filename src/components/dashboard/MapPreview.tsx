export function MapPreview() {
  return (
    <div className="card p-6">
      <h2 className="mb-5 font-bold">Geographic Distribution</h2>
      <div className="grid h-56 place-items-center rounded-2xl bg-gradient-to-br from-emerald-50 via-yellow-50 to-white">
        <div className="text-center">
          <div className="mx-auto mb-3 h-28 w-40 rounded-[45%_55%_50%_50%] bg-[radial-gradient(circle_at_30%_25%,#4CC9A0,transparent_28%),radial-gradient(circle_at_70%_35%,#0FA67A,transparent_30%),radial-gradient(circle_at_50%_70%,#F5B400,transparent_28%)] opacity-90" />
          <div className="text-sm font-semibold text-slate-600">Uganda district performance map</div>
          <div className="text-xs text-slate-400">Map engine placeholder</div>
        </div>
      </div>
    </div>
  );
}
