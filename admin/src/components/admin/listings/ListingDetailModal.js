import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import StatusBadge from "./StatusBadge";
import { ExternalLink } from "lucide-react";

export default function ListingDetailModal({ view, setView }) {
  const frontendUrl =
    process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3001";

  return (
    <Modal
      open={!!view}
      onClose={() => setView(null)}
      title="Listing information"
      description={view ? `#${view.id} • ${view.title || "Untitled"}` : ""}
      size="lg"
      footer={
        <div className="flex justify-between w-full">
          <Button
            onClick={() =>
              window.open(`${frontendUrl}/rooms/${view?.id}`, "_blank")
            }
            variant="primary"
          >
            <ExternalLink className="w-4 h-4" />
            Go to page
          </Button>
          <Button variant="secondary" onClick={() => setView(null)}>
            Close
          </Button>
        </div>
      }
    >
      {view ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="p-4 border rounded-2xl ui-border">
            <div className="text-sm font-semibold">Summary</div>
            <div className="mt-2 space-y-1 text-sm ui-fg">
              <div>
                <span className="ui-muted">Status:</span>{" "}
                <StatusBadge status={view.status} />
              </div>
              <div>
                <span className="ui-muted">City:</span> {view.city || "—"}
              </div>
              <div>
                <span className="ui-muted">Host:</span>{" "}
                {view.host?.full_name || "—"} ({view.host?.email || "—"})
              </div>
              {view.price_per_night != null ? (
                <div>
                  <span className="ui-muted">Price/night:</span>{" "}
                  {Number(view.price_per_night).toLocaleString()} ₫
                </div>
              ) : null}
            </div>
          </div>

          <div className="p-4 border rounded-2xl ui-border">
            <div className="text-sm font-semibold">Details</div>
            <div className="mt-2 space-y-1 text-sm ui-fg">
              <div>
                <span className="ui-muted">Address:</span>{" "}
                {view.address || "—"}
              </div>
              <div>
                <span className="ui-muted">Guests:</span>{" "}
                {view.max_guests || "—"} • Bedrooms: {view.bedrooms || "—"} •
                Beds: {view.beds || "—"} • Baths: {view.bathrooms || "—"}
              </div>
              <div className="pt-2">
                <div className="text-xs font-semibold ui-muted">
                  Description
                </div>
                <div className="p-3 mt-1 text-sm whitespace-pre-wrap rounded-xl bg-white/5 ui-muted">
                  {view.description || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
