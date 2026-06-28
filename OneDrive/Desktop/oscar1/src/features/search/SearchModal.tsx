import { useState, useEffect } from "react";
import { Search, X, PackageOpen } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useProductStore } from "@/store/productStore";
import { Link } from "react-router-dom";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const products = useProductStore((state) => state.products);

  const results = query.trim().length > 1 
    ? products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  // Reset query when closed
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-md bg-slate-50 p-0 border-none rounded-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-4 pt-4 pb-2 bg-white flex items-center justify-between">
          <DialogTitle className="text-xl font-bold text-slate-800">Qidiruv</DialogTitle>
        </div>
        <div className="px-4 pb-4 bg-white border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mahsulot qidirish..." 
              className="pl-10 h-12 bg-slate-50 border-transparent rounded-xl text-base focus-visible:ring-primary/20 focus-visible:bg-white focus-visible:border-primary/30"
            />
            {query && (
              <button 
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          {query.trim().length <= 1 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center">
              <Search className="w-12 h-12 mb-3 text-slate-200" />
              <p>Qidirish uchun kamida 2 ta harf kiriting</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Natijalar ({results.length})
              </p>
              {results.map(product => (
                <Link
                  key={`search-${product.id}`}
                  to={`/product/${product.id}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-primary/20 active:scale-[0.98] transition-all"
                >
                  <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-contain"
                      onError={(e) => { e.currentTarget.style.display='none'; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <h4 className="font-semibold text-slate-800 text-sm truncate">{product.name}</h4>
                    <p className="font-bold text-primary text-sm mt-0.5">
                      {product.priceBox > 0 ? `${product.priceBox.toLocaleString("uz-UZ")} so'm` : `$${product.pricePiece}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center">
              <PackageOpen className="w-12 h-12 mb-3 text-slate-300" />
              <p>Hech narsa topilmadi</p>
              <p className="text-sm text-slate-400 mt-1">Boshqa so'z bilan qidirib ko'ring</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
