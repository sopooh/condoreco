// Shell responsive per la pagina edificio. Non serve più un client component:
// il breakpoint è deciso da CSS (.building-layout-wrap/.building-layout-grid
// in globals.css), non da useIsMobile — niente flash di hydration mismatch,
// e left/aside restano renderizzabili lato server.
export default function BuildingLayout({ left, aside }) {
  return (
    <div className="wrap building-layout-wrap">
      <div className="building-layout-grid">
        <div>{left}</div>
        <aside>{aside}</aside>
      </div>
    </div>
  )
}
