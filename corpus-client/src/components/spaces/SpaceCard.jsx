import { useNavigate } from 'react-router-dom'

export default function SpaceCard({ space }) {
  const navigate = useNavigate()
  const color = space.color || '#5EEAD4'

  return (
    <div
      onClick={() => navigate(`/spaces/${space._id}`)}
      className="space-stack h-[180px] w-full max-w-[340px] group relative"
    >
      {/* Stacked layers (behind) */}
      <div
        className="stack-layer layer-3 opacity-0 group-hover:opacity-100"
        style={{ backgroundColor: color }}
      ></div>
      <div
        className="stack-layer layer-2 opacity-0 group-hover:opacity-100"
        style={{ backgroundColor: color }}
      ></div>

      {/* Main card layer (front) */}
      <div
        className="stack-layer layer-1 p-6 flex flex-col justify-between"
        style={{ backgroundColor: color }}
      >
        <div className="relative">
          <h2 className="text-[22px] font-roc font-bold uppercase flex items-center gap-3 truncate text-black">
            <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="20">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
            <span className="truncate">{space.name}</span>
          </h2>
          <span className="font-mono text-[9px] uppercase tracking-wider text-black/60 block mt-1">
            {space.itemCount || 0} item{space.itemCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="bg-white border-2 border-black py-2 text-center text-[11px] font-bold font-circular uppercase tracking-widest hover:bg-black hover:text-white transition-colors text-black">
          SEE ALL
        </div>
      </div>

      {/* Rotating Badge on Hover */}
      <div className="learn-more-badge pointer-events-none">
        <svg className="badge-svg w-full h-full" viewBox="0 0 100 100">
          <path id="circlePath" d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0" fill="none" />
          <text className="text-[7px] font-bold fill-black font-circular tracking-[0.12em] uppercase">
            <textPath href="#circlePath">
              EXPLORE SPACE • EXPLORE SPACE • 
            </textPath>
          </text>
        </svg>
      </div>
    </div>
  )
}
