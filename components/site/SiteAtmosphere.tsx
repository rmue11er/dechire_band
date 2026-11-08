/**
 * Film layer of the public page: grain and a soft vignette.
 * No scanlines, no progress bar – nothing that reads as a screen.
 */
export default function SiteAtmosphere() {
  return (
    <div className="atmo" aria-hidden="true">
      <div className="atmo-grain" />
      <div className="atmo-vignette" />
    </div>
  );
}
