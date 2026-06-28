// // src/pages/Checkout.tsx
// import { useState, useEffect, useRef, useCallback } from "react";
// import { useNavigate } from "react-router-dom";
// import { ChevronLeft, Loader2, CheckCircle2, MapPin, ChevronDown, Navigation, X, Truck, Store } from "lucide-react";
// import { useCartStore } from "@/store/cartStore";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Dialog, DialogContent } from "@/components/ui/dialog";
// import { GoogleMap, useLoadScript } from "@react-google-maps/api";
// import { addDoc, collection, serverTimestamp } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import { STORE_LOCATION, estimateRoadDistance, calculateDeliveryFee } from "@/lib/delivery";
// import { useSettingsStore } from "@/store/settingsStore";
// import { useI18nStore } from "@/store/i18nStore";


// // Phone formatter: +998 XX XXX XX XX
// const formatPhoneNumber = (value: string) => {
//   const digits = value.replace(/\D/g, "");
//   let formatted = "+998";

//   if (digits.length > 3) {
//     formatted += " " + digits.substring(3, 5);
//   }
//   if (digits.length > 5) {
//     formatted += " " + digits.substring(5, 8);
//   }
//   if (digits.length > 8) {
//     formatted += " " + digits.substring(8, 10);
//   }
//   if (digits.length > 10) {
//     formatted += " " + digits.substring(10, 12);
//   }

//   return formatted;
// };

// // Full Uzbekistan regions and districts data
// const DISTRICTS: Record<string, string[]> = {
//   "Toshkent shahri": ["Bektemir", "Chilonzor", "Yashnobod", "Mirobod", "Mirzo Ulug'bek", "Sergeli", "Shayxontohur", "Olmazor", "Uchtepa", "Yakkasaroy", "Yunusobod", "Yangihayot"],
//   "Toshkent viloyati": ["Olmaliq shahri", "Angren shahri", "Bekobod shahri", "Chirchiq shahri", "Nurafshon shahri", "Bekobod tumani", "Bo'stonliq", "Bo'ka", "Qibray", "Zangiota", "Yuqori Chirchiq", "Yangiyo'l", "O'rta Chirchiq", "Parkent"],
//   "Samarqand viloyati": ["Samarqand shahri", "Kattaqo'rg'on shahri", "Bulung'ur", "Jomboy", "Ishtixon", "Kattaqo'rg'on", "Narpay", "Nurobod", "Oqdaryo", "Paxtachi", "Payariq", "Pastdarg'om", "Qo'shrabot", "Samarqand tumani", "Tayloq", "Urgut"],
//   "Buxoro viloyati": ["Buxoro shahri", "Kogon shahri", "Olot", "Buxoro tumani", "Vobkent", "G'ijduvon", "Jondor", "Kogon tumani", "Qorako'l", "Qorovulbozor", "Peshku", "Romitan", "Shofirkon"],
//   "Andijon viloyati": ["Andijon shahri", "Xonabod shahri", "Andijon tumani", "Asaka", "Baliqchi", "Bo'z", "Buloqboshi", "Jalaquduq", "Izboskan", "Qo'rg'ontepa", "Marhamat", "Oltinko'l", "Paxtaobod", "Shaxrixon", "Ulug'nor"],
//   "Farg'ona viloyati": ["Farg'ona shahri", "Marg'ilon shahri", "Qo'qon shahri", "Quvasoy shahri", "Oltiariq", "Bag'dod", "Beshariq", "Buvayda", "Dang'ara", "Farg'ona tumani", "Furqat", "Qo'shtepa", "Quva", "Rishton", "So'x", "Toshloq", "Uchko'prik", "Yozyovon"],
//   "Namangan viloyati": ["Namangan shahri", "Mingbuloq", "Kosonsoy", "Namangan tumani", "Norin", "Pop", "To'raqo'rg'on", "Uychi", "Uchqo'rg'on", "Chortoq", "Chust", "Yangiqo'rg'on"],
//   "Qashqadaryo viloyati": ["Qarshi shahri", "Shahrisabz shahri", "G'uzor", "Dehqonobod", "Qamashi", "Qarshi tumani", "Koson", "Kitob", "Mirishkor", "Muborak", "Nishon", "Kasbi", "Ko'kdala", "Yakkabog'"],
//   "Surxondaryo viloyati": ["Termiz shahri", "Angor", "Boysun", "Denov", "Jarqo'rg'on", "Qiziriq", "Qumqo'rg'on", "Muzrabot", "Oltinsoy", "Sariosiyo", "Sherobod", "Sho'rchi", "Termiz tumani", "Uzun"],
//   "Xorazm viloyati": ["Urganch shahri", "Xiva shahri", "Bog'ot", "Gurlan", "Qo'shko'pir", "Urganch tumani", "Xazarasp", "Xonqa", "Xiva tumani", "Shovot", "Yangiariq", "Yangibozor"],
//   "Navoiy viloyati": ["Navoiy shahri", "Zarafshon shahri", "Karmana", "Qiziltepa", "Xatirchi", "Navbahor", "Nurota", "Tomdi", "Uchquduq"],
//   "Jizzax viloyati": ["Jizzax shahri", "Arnasoy", "Baxmal", "Do'stlik", "Forish", "G'allaorol", "Sharof Rashidov", "Mirzacho'l", "Paxtakor", "Yangiobod", "Zomin", "Zafarobod"],
//   "Sirdaryo viloyati": ["Guliston shahri", "Yangiyer shahri", "Shirin shahri", "Oqoltin", "Boyovut", "Guliston tumani", "Xavos", "Sirdaryo tumani", "Sayxunobod", "Sardoba", "Mirzaobod"],
//   "Qoraqalpog'iston": ["Nukus shahri", "Amudaryo", "Beruniy", "Chimboy", "Ellikqal'a", "Kegeyli", "Mo'ynoq", "Nukus tumani", "Qonliko'l", "Qo'ng'irot", "Qorao'zak", "Shumanay", "Taxtako'pir", "To'rtko'l", "Xo'jayli", "Taxiatosh", "Bo'zatov"]
// };
// const REGIONS = Object.keys(DISTRICTS);


// // Custom Select Component for better UI
// interface CustomSelectProps {
//   options: string[];
//   value: string;
//   onChange: (value: string) => void;
//   placeholder: string;
//   disabled?: boolean;
// }

// function CustomSelect({ options, value, onChange, placeholder, disabled }: CustomSelectProps) {
//   const [isOpen, setIsOpen] = useState(false);
//   const t = useI18nStore((s) => s.t);
//   const lang = useI18nStore((s) => s.lang);

//   return (
//     <div className={`relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
//       <button
//         type="button"
//         onClick={() => setIsOpen(!isOpen)}
//         className="w-full h-12 rounded-xl font-semibold bg-slate-50/50 border border-slate-200 px-3 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all hover:bg-slate-50"
//       >
//         <span className={value ? "text-slate-800" : "text-slate-400"}>
//           {value || placeholder}
//         </span>
//         <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
//       </button>
//       {isOpen && (
//         <>
//           <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
//           <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-[0_10px_40px_rgb(0,0,0,0.08)] py-1 max-h-40 overflow-auto animate-in fade-in zoom-in-95 duration-100">
//             {options.length === 0 ? (
//               <div className="px-4 py-3 text-sm text-slate-400 text-center">{t('checkout.empty_options')}</div>
//             ) : (
//               options.map((opt) => (
//                 <button
//                   key={opt}
//                   type="button"
//                   className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-slate-50 ${value === opt ? 'bg-primary/5 text-primary font-semibold' : 'text-slate-700'}`}
//                   onClick={() => {
//                     onChange(opt);
//                     setIsOpen(false);
//                   }}
//                 >
//                   {opt}
//                 </button>
//               ))
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// interface LocationData {
//   lat: number | null;
//   lng: number | null;
//   address: string;

// }

// export function Checkout() {
//   const navigate = useNavigate();
//   const { items, clearCart } = useCartStore();
//   const t = useI18nStore((s) => s.t);

//   const { isLoaded } = useLoadScript({
//     googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
//   });

//   const USD_TO_UZS = useSettingsStore((s) => s.usdRate);

//   const totalUSD = items.reduce((acc, item) => {
//     const itemPriceUSD = item.unit === 'item' ? item.price : (item.price / USD_TO_UZS);
//     return acc + (itemPriceUSD * item.quantity);
//   }, 0);
//   const totalUZS = totalUSD * USD_TO_UZS;

//   const [checkoutStep, setCheckoutStep] = useState<"idle" | "processing" | "verifying" | "finalizing" | "success">("idle");
//   const [finalTotalUZS, setFinalTotalUZS] = useState(0);

//   const [formData, setFormData] = useState(() => {
//     try {
//       const saved = localStorage.getItem("oscar_userData");
//       if (saved) {
//         const parsed = JSON.parse(saved);
//         return {
//           name: parsed.name || "",
//           phone: parsed.phone || "+998 ",
//           region: parsed.region || "",
//           district: parsed.district || "",
//           location: parsed.location || { lat: null, lng: null, address: "" }
//         };
//       }
//     } catch (e) { }
//     return {
//       name: "",
//       phone: "+998 ",
//       region: "",
//       district: "",
//       location: { lat: null, lng: null, address: "" }
//     };
//   });

//   const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
//   const [paymentProvider, setPaymentProvider] = useState<"payme" | "uzum" | null>(null);

//   const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
//   const [deliveryFeeData, setDeliveryFeeData] = useState<{ fee: number; isFree: boolean; reason: string; distanceKm: number | null }>({ fee: 0, isFree: false, reason: '', distanceKm: null });

//   const deliveryFeeUZS = deliveryMethod === 'pickup' ? 0 : deliveryFeeData.fee;
//   const finalTotalUZSWithDelivery = totalUZS + deliveryFeeUZS;
//   const deliveryFeeUSD = parseFloat((deliveryFeeUZS / USD_TO_UZS).toFixed(2));
//   const finalTotalUSDWithDelivery = parseFloat((totalUSD + deliveryFeeUSD).toFixed(2));

//   // Map state
//   const [isMapOpen, setIsMapOpen] = useState(false);
//   const [mapCenter, setMapCenter] = useState({ lat: 41.2995, lng: 69.2401 }); // Tashkent default
//   const [isGeocoding, setIsGeocoding] = useState(false);
//   const [tempLocation, setTempLocation] = useState<LocationData>({ lat: null, lng: null, address: "" });

//   const mapRef = useRef<google.maps.Map | null>(null);
//   const geocoderRef = useRef<google.maps.Geocoder | null>(null);
//   const geocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
//   const lastFetchedCenterRef = useRef<{ lat: number; lng: number } | null>(null);

//   useEffect(() => {
//     try {
//       localStorage.setItem("oscar_userData", JSON.stringify(formData));
//     } catch (e) { }
//   }, [formData]);

//   // Update delivery fee data when location changes
//   useEffect(() => {
//     if (deliveryMethod === 'pickup') return;

//     if (formData.location.lat && formData.location.lng) {
//       const dist = estimateRoadDistance(STORE_LOCATION.lat, STORE_LOCATION.lng, formData.location.lat, formData.location.lng);
//       const feeInfo = calculateDeliveryFee(dist, totalUSD);
//       setDeliveryFeeData({ ...feeInfo, distanceKm: dist });
//     } else {
//       const feeInfo = calculateDeliveryFee(0, totalUSD);
//       if (feeInfo.isFree) {
//         setDeliveryFeeData({ ...feeInfo, distanceKm: null });
//       } else {
//         setDeliveryFeeData({ fee: 0, isFree: false, reason: '', distanceKm: null });
//       }
//     }
//   }, [formData.location.lat, formData.location.lng, totalUSD, deliveryMethod]);

//   // Initialize Geocoder
//   useEffect(() => {
//     if (isLoaded && !geocoderRef.current) {
//       geocoderRef.current = new window.google.maps.Geocoder();
//     }
//   }, [isLoaded]);

//   // Update map center when region/district changes
//   useEffect(() => {
//     if (!geocoderRef.current || !formData.region) return;

//     const query = formData.district
//       ? `${formData.region}, ${formData.district}`
//       : formData.region;

//     geocoderRef.current.geocode({ address: query }, async (results, status) => {
//       if (status === "OK" && results && results[0]) {
//         const location = results[0].geometry.location;
//         const coords = { lat: location.lat(), lng: location.lng() };
//         setMapCenter(coords);

//         if (mapRef.current) {
//           mapRef.current.panTo(coords);
//         }
//       } else {
//         // Fallback to OpenStreetMap if Google Geocoding is restricted
//         try {
//           const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Uzbekistan')}`);
//           const data = await res.json();
//           if (data && data.length > 0) {
//             const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
//             setMapCenter(coords);
//             if (mapRef.current) {
//               mapRef.current.panTo(coords);
//             }
//           }
//         } catch (e) {
//           console.error("OSM Fallback failed:", e);
//         }
//       }
//     });
//   }, [formData.region, formData.district]);

//   const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     let val = e.target.value;
//     if (!val.startsWith("+998")) {
//       val = "+998 " + val.replace(/\D/g, "");
//     }
//     setFormData({ ...formData, phone: formatPhoneNumber(val) });
//   };

//   const fetchAddress = useCallback((lat: number, lng: number) => {
//     if (!geocoderRef.current) return;
//     setIsGeocoding(true);

//     geocoderRef.current.geocode({ location: { lat, lng } }, async (results, status) => {
//       console.log("GEOCODE RESULT:", results, status);
//       if (status === "OK" && results && results[0]) {
//         const address = results[0].formatted_address;
//         const newLoc = { lat, lng, address };
//         setTempLocation(newLoc);
//         console.log("SELECTED LOCATION:", newLoc);
//         setIsGeocoding(false);
//       } else {
//         // Fallback to OpenStreetMap if Google Geocoding is restricted
//         try {
//           const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
//           const data = await res.json();
//           if (data && data.display_name) {
//             const newLoc = { lat, lng, address: data.display_name };
//             setTempLocation(newLoc);
//             console.log("OSM FALLBACK LOCATION:", newLoc);
//           } else {
//             setTempLocation(prev => ({ ...prev, lat, lng, address: "Manzil topilmadi" }));
//           }
//         } catch (err) {
//           setTempLocation(prev => ({ ...prev, lat, lng, address: "Manzil topilmadi" }));
//         }
//         setIsGeocoding(false);
//       }
//     });
//   }, []);

//   const handleIdle = useCallback(() => {
//     if (!mapRef.current) return;
//     const center = mapRef.current.getCenter();
//     if (!center) return;

//     const lat = center.lat();
//     const lng = center.lng();

//     // Prevent infinite loops caused by map resizing
//     if (lastFetchedCenterRef.current) {
//       const latDiff = Math.abs(lastFetchedCenterRef.current.lat - lat);
//       const lngDiff = Math.abs(lastFetchedCenterRef.current.lng - lng);
//       // If movement is negligible, don't trigger geocoding again
//       if (latDiff < 0.0001 && lngDiff < 0.0001) {
//         return;
//       }
//     }

//     lastFetchedCenterRef.current = { lat, lng };

//     console.log("CENTER:", { lat, lng });
//     setTempLocation(prev => ({ ...prev, lat, lng, address: "" }));

//     if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
//     setIsGeocoding(true);

//     geocodeTimeoutRef.current = setTimeout(() => {
//       fetchAddress(lat, lng);
//     }, 600);
//   }, [fetchAddress]);

//   const openMap = () => {
//     setIsMapOpen(true);

//     setTimeout(() => {
//       if (mapRef.current) {
//         const center = mapRef.current.getCenter();
//         if (center) {
//           fetchAddress(center.lat(), center.lng());
//         }
//       } else if (formData.location.lat && formData.location.lng) {
//         setMapCenter({ lat: formData.location.lat, lng: formData.location.lng });
//       }
//     }, 500);
//   };

//   const confirmMapLocation = () => {
//     setFormData(prev => ({ ...prev, location: tempLocation }));
//     setIsMapOpen(false);
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (checkoutStep !== "idle" || items.length === 0) return;

//     if (formData.phone.length < 17) {
//       alert("Iltimos, telefon raqamini to'liq kiriting.");
//       return;
//     }

//     if (deliveryMethod === 'delivery' && (!formData.location.lat || !formData.location.lng || !formData.location.address)) {
//       alert("Iltimos, xaritadan manzilni tanlang va tasdiqlang.");
//       return;
//     }

//     if (paymentMethod === "card" && !paymentProvider) {
//       alert("Iltimos, to'lov tizimini tanlang.");
//       return;
//     }

//     setCheckoutStep("processing");

//     if (paymentMethod === "card") {
//       const url = paymentProvider === "payme"
//         ? "https://payme.uz/fallback/merchant/?id=660d234690823bcdf98bebe5"
//         : "https://www.apelsin.uz/open-service?serviceId=498609633";

//       window.open(url, "_blank");
//       await new Promise(r => setTimeout(r, 1500));
//     } else {
//       await new Promise(r => setTimeout(r, 1000));
//     }

//     // Telegram chat_id olish
//     let telegramChatId = null;
//     try {
//       const tg = (window as any).Telegram?.WebApp;
//       if (tg?.initDataUnsafe?.user?.id) {
//         telegramChatId = tg.initDataUnsafe.user.id;
//       }
//     } catch (e) { }

//     let orderId = "";
//     try {
//       const docRef = await addDoc(collection(db, "orders"), {
//         customerName: formData.name,
//         customerPhone: formData.phone,
//         region: formData.region,
//         district: formData.district,
//         location: {
//           lat: formData.location.lat,
//           lng: formData.location.lng,
//           address: formData.location.address
//         },
//         items: items.map(item => ({
//           productId: item.productId,
//           name: item.name,
//           price: item.price,
//           originalPrice: item.originalPrice,
//           discount: item.discount,
//           quantity: item.quantity,
//           unit: item.unit
//         })),
//         totalUSD: finalTotalUSDWithDelivery,
//         totalUZS: finalTotalUZSWithDelivery,
//         deliveryMethod: deliveryMethod,
//         deliveryFee: deliveryFeeUZS,
//         deliveryFeeUsd: deliveryFeeUSD,
//         distanceKm: deliveryMethod === 'pickup' ? null : (deliveryFeeData.distanceKm ? Number(deliveryFeeData.distanceKm.toFixed(1)) : null),
//         deliveryAddress: deliveryMethod === 'pickup' ? null : formData.location.address,
//         deliveryCoords: deliveryMethod === 'pickup' ? null : { lat: formData.location.lat, lng: formData.location.lng },
//         paymentMethod: paymentMethod,
//         paymentProvider: paymentProvider || null,
//         status: "new",
//         telegramChatId: telegramChatId,
//         createdAt: serverTimestamp()
//       });

//       orderId = docRef.id;

//       // telegram_users ga phone va chatId saqlash
//       if (telegramChatId) {
//         try {
//           const { doc: firestoreDoc, setDoc } = await import("firebase/firestore");
//           await setDoc(firestoreDoc(db, "telegram_users", String(telegramChatId)), {
//             chatId: telegramChatId,
//             phone: formData.phone.replace(/\s/g, ""),
//           }, { merge: true });
//         } catch (e) {
//           console.error("telegram_users saqlashda xato:", e);
//         }
//       }
//       console.log("Order saved with ID: ", orderId);
//     } catch (error) {
//       console.error("Error saving order to Firestore:", error);
//     }

//     setFinalTotalUZS(finalTotalUZSWithDelivery);
//     setCheckoutStep("success");
//     clearCart();

//     // Redirect to home after 3 seconds
//     setTimeout(() => {
//       navigate("/");
//     }, 3000);
//   };

//   if (checkoutStep === "success") {
//     return (
//       <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
//         <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6">
//           <CheckCircle2 className="w-12 h-12" />
//         </div>
//         <h1 className="text-3xl font-extrabold text-slate-800 mb-2">
//           {paymentMethod === "card" ? t('checkout.success_card') : t('checkout.success_title')}
//         </h1>
//         <p className="text-slate-500 mb-8 max-w-[280px]">
//           {paymentMethod === "card" ? t('checkout.success_desc_card') : t('checkout.success_desc')}
//         </p>
//         <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 w-full max-w-sm mb-8">
//           <p className="text-sm text-slate-500 font-medium mb-1">{t('checkout.success_amount')}</p>
//           <p className="text-2xl font-black text-slate-800">{finalTotalUZS.toLocaleString("uz-UZ")} so'm</p>
//         </div>
//         <Button
//           onClick={() => navigate("/")}
//           className="w-full max-w-sm h-14 rounded-2xl text-lg font-bold"
//         >
//           {t('checkout.back_home')}
//         </Button>
//       </div>
//     );
//   }

//   const getButtonText = () => {
//     if (checkoutStep !== "idle") return t('checkout.loading');
//     return t('checkout.submit');
//   };

//   const availableDistricts = formData.region ? DISTRICTS[formData.region] || [] : [];

//   let telegramChatId = null;
//   try {
//     const tg = (window as any).Telegram?.WebApp;
//     if (tg?.initDataUnsafe?.user?.id) {
//       telegramChatId = tg.initDataUnsafe.user.id;
//     }
//     if (!telegramChatId && tg?.initData) {
//       const params = new URLSearchParams(tg.initData);
//       const userStr = params.get("user");
//       if (userStr) {
//         const user = JSON.parse(decodeURIComponent(userStr));
//         telegramChatId = user?.id || null;
//       }
//     }
//     // Vaqtincha tekshirish uchun
//     // alert("telegramChatId: " + telegramChatId + "\ninitData: " + (tg?.initData ? "bor" : "yo'q"));
//   } catch (e) {
//     alert("Xato: " + e);
//   }

//   return (
//     <div className="min-h-screen bg-slate-50 pb-[160px]">
//       <div className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b">
//         <div className="container flex h-14 items-center px-4 max-w-2xl mx-auto">
//           <button
//             onClick={() => navigate(-1)}
//             className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 transition-colors -ml-2"
//           >
//             <ChevronLeft className="w-6 h-6" />
//           </button>
//           <h1 className="ml-2 font-semibold text-lg">{t('checkout.title')}</h1>
//         </div>
//       </div>

//       <main className="container px-4 pt-6 max-w-2xl mx-auto">
//         <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 mb-6">
//           <h3 className="font-semibold text-slate-800 mb-4">{t('checkout.order_info')}</h3>
//           <div className="space-y-3 mb-4">
//             {items.map((item) => (
//               <div key={item.cartItemId} className="flex justify-between text-sm">
//                 <span className="text-slate-600 truncate pr-2">
//                   {item.quantity} x {item.name} ({item.unit === 'box' ? t('checkout.box') : t('checkout.item')})
//                 </span>
//                 <span className="font-medium text-slate-800 whitespace-nowrap">
//                   {item.unit === 'item' ? `$${(item.quantity * item.price).toFixed(2)}` : `${(item.quantity * item.price).toLocaleString("uz-UZ")} UZS`}
//                 </span>
//               </div>
//             ))}
//           </div>
//           <div className="pt-4 border-t flex flex-col gap-2 font-bold text-sm">
//             <div className="flex justify-between items-center text-slate-600 font-medium">
//               <span>{t('checkout.products')}:</span>
//               <span>{totalUZS.toLocaleString("uz-UZ")} so'm ≈ ${totalUSD.toFixed(2)}</span>
//             </div>

//             <div className="flex justify-between items-start text-slate-600 font-medium pb-2 border-b border-dashed border-slate-200">
//               <span>{t('checkout.delivery_fee')}:</span>
//               <div className="flex flex-col items-end text-right">
//                 {deliveryMethod === 'pickup' ? (
//                   <span className="text-primary font-bold">{t('checkout.pickup_free')}</span>
//                 ) : (
//                   deliveryMethod === 'delivery' && deliveryFeeData.isFree ? (
//                     <>
//                       <span className="text-primary font-bold">
//                         {deliveryFeeData.reason === 'order_over_threshold' ? t('checkout.free_order') : t('checkout.free')}
//                       </span>
//                       {deliveryFeeData.distanceKm !== null && (
//                         <span className="text-xs text-slate-400 line-through mt-0.5 font-normal">
//                           ~~{(calculateDeliveryFee(deliveryFeeData.distanceKm, 0).fee).toLocaleString("uz-UZ")} so'm ≈ ${(calculateDeliveryFee(deliveryFeeData.distanceKm, 0).fee / USD_TO_UZS).toFixed(2)}~~
//                         </span>
//                       )}
//                     </>
//                   ) : (
//                     deliveryFeeData.distanceKm === null ? (
//                       <span className="text-slate-400 font-normal">{t('checkout.select_address')}</span>
//                     ) : (
//                       <>
//                         <span className="text-slate-800">
//                           {deliveryFeeData.fee.toLocaleString("uz-UZ")} so'm ≈ ${parseFloat((deliveryFeeData.fee / USD_TO_UZS).toFixed(2))}
//                         </span>
//                         <span className="text-xs text-slate-500 font-normal mt-0.5">
//                           {t('checkout.distance')}: ~{deliveryFeeData.distanceKm.toFixed(1)} km
//                         </span>
//                       </>
//                     )
//                   )
//                 )}
//               </div>
//             </div>

//             <div className="flex justify-between items-center mt-2">
//               <span>{t('checkout.total')}:</span>
//               <div className="flex flex-col items-end">
//                 <span className="text-primary text-xl font-black">{finalTotalUZSWithDelivery.toLocaleString("uz-UZ")} so'm</span>
//                 <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">≈ ${finalTotalUSDWithDelivery.toFixed(2)}</span>
//               </div>
//             </div>
//           </div>
//         </div>

//         <form onSubmit={handleSubmit} className="space-y-6">
//           <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 space-y-4">
//             <h3 className="font-semibold text-slate-800 mb-3">{t('checkout.personal')}</h3>
//             <div className="space-y-4">
//               <div>
//                 <label className="text-xs font-bold text-slate-500 ml-1 mb-1.5 block uppercase tracking-wider">{t('checkout.name')}</label>
//                 <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={t('checkout.name')} className="h-12 rounded-xl bg-slate-50/50 border-slate-200" />
//               </div>
//               <div>
//                 <label className="text-xs font-bold text-slate-500 ml-1 mb-1.5 block uppercase tracking-wider">{t('checkout.phone')}</label>
//                 <Input required value={formData.phone} onChange={handlePhoneChange} type="tel" placeholder="+998 90 123 45 67" className="h-12 rounded-xl bg-slate-50/50 border-slate-200 font-medium tracking-wide" />
//               </div>
//             </div>
//           </div>

//           <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 space-y-4">
//             <h3 className="font-semibold text-slate-800 mb-3">{t('checkout.payment')}</h3>
//             <div className="grid grid-cols-2 gap-3">
//               <button
//                 type="button"
//                 onClick={() => setPaymentMethod("cash")}
//                 className={`h-12 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${paymentMethod === "cash" ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}
//               >
//                 {t('checkout.cash')}
//               </button>
//               <button
//                 type="button"
//                 onClick={() => setPaymentMethod("card")}
//                 className={`h-12 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${paymentMethod === "card" ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}
//               >
//                 {t('checkout.card')}
//               </button>
//             </div>

//             {/* Payment Providers */}
//             <div className={`overflow-hidden transition-all duration-300 ${paymentMethod === 'card' ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
//               <p className="text-xs font-bold text-slate-500 ml-1 mb-2 block uppercase tracking-wider">{t('checkout.payment_system')}</p>
//               <div className="grid grid-cols-2 gap-3">
//                 <button
//                   type="button"
//                   onClick={() => setPaymentProvider("payme")}
//                   className={`h-14 rounded-xl font-bold transition-all border-2 flex items-center justify-center overflow-hidden ${paymentProvider === "payme" ? 'border-[#33cccc] bg-[#33cccc]/10' : 'border-slate-100 hover:bg-slate-50'}`}
//                 >
//                   <span className="text-[#33cccc] font-black text-lg tracking-wide">Payme</span>
//                 </button>
//                 <button
//                   type="button"
//                   onClick={() => setPaymentProvider("uzum")}
//                   className={`h-14 rounded-xl font-bold transition-all border-2 flex items-center justify-center overflow-hidden ${paymentProvider === "uzum" ? 'border-[#5c00e6] bg-[#5c00e6]/10' : 'border-slate-100 hover:bg-slate-50'}`}
//                 >
//                   <span className="text-[#5c00e6] font-black text-lg tracking-wide">Uzum</span>
//                 </button>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 space-y-4">
//             <h3 className="font-semibold text-slate-800 mb-3">{t('checkout.delivery')}</h3>
//             <div className="grid grid-cols-2 gap-3">
//               <button
//                 type="button"
//                 onClick={() => setDeliveryMethod("delivery")}
//                 className={`h-12 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${deliveryMethod === "delivery" ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}
//               >
//                 <Truck className="w-4 h-4" />
//                 {t('checkout.delivery_btn')}
//               </button>
//               <button
//                 type="button"
//                 onClick={() => setDeliveryMethod("pickup")}
//                 className={`h-12 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${deliveryMethod === "pickup" ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}
//               >
//                 <Store className="w-4 h-4" />
//                 {t('checkout.pickup')}
//               </button>
//             </div>
//           </div>

//           {deliveryMethod === 'delivery' ? (
//             <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 space-y-4">
//               <h3 className="font-semibold text-slate-800 mb-3">{t('checkout.address')}</h3>

//               <div className="space-y-4">
//                 <div className="grid grid-cols-2 gap-3">
//                   <div>
//                     <label className="text-xs font-bold text-slate-500 ml-1 mb-1.5 block uppercase tracking-wider">{t('checkout.region')}</label>
//                     <CustomSelect
//                       value={formData.region}
//                       onChange={(val) => setFormData({ ...formData, region: val, district: "" })}
//                       options={REGIONS}
//                       placeholder={t('checkout.select_region')}
//                     />
//                   </div>
//                   <div>
//                     <label className="text-xs font-bold text-slate-500 ml-1 mb-1.5 block uppercase tracking-wider">{t('checkout.district')}</label>
//                     <CustomSelect
//                       value={formData.district}
//                       onChange={(val) => setFormData({ ...formData, district: val })}
//                       options={availableDistricts}
//                       placeholder={t('checkout.select_district')}
//                       disabled={!formData.region}
//                     />
//                   </div>
//                 </div>

//                 <div className="pt-2">
//                   {formData.location.address ? (
//                     <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
//                       <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
//                       <div className="flex-1">
//                         <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{t('checkout.selected_address')}</p>
//                         <p className="text-sm font-medium text-slate-800 leading-snug">{formData.location.address}</p>
//                       </div>
//                     </div>
//                   ) : null}
//                   <Button
//                     type="button"
//                     variant="outline"
//                     onClick={openMap}
//                     className="w-full h-12 rounded-xl text-[15px] font-bold border-2 border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 transition-all active:scale-95"
//                   >
//                     <Navigation className="w-4 h-4 text-slate-500" />
//                     {formData.location.address ? t('checkout.change_map') : t('checkout.select_map')}
//                   </Button>
//                 </div>
//               </div>
//             </div>
//           ) : (
//             <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 space-y-4">
//               <h3 className="font-semibold text-slate-800 mb-3">{t('checkout.pickup_address')}</h3>
//               <div className="mb-1 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
//                 <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
//                 <div className="flex-1">
//                   <p className="text-sm font-bold text-slate-800 leading-snug">{STORE_LOCATION.name}</p>
//                   <p className="text-xs text-slate-500 font-medium mt-1 mb-2">{t('checkout.pickup_info')}</p>
//                   <a href={STORE_LOCATION.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/5 px-2.5 py-1.5 rounded-lg w-fit">
//                     📍 {t('checkout.view_map')}
//                   </a>
//                 </div>
//               </div>
//             </div>
//           )}

//           <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 p-4 bg-white/95 backdrop-blur-sm border-t pb-8 z-30 max-w-2xl mx-auto shadow-[0_-10px_40px_rgb(0,0,0,0.05)]">
//             <Button
//               type="submit"
//               className="w-full h-14 rounded-2xl text-lg font-bold active:scale-95 transition-all flex items-center justify-center gap-2 overflow-hidden relative"
//               disabled={checkoutStep !== "idle" || items.length === 0 || !formData.name || formData.phone.length < 17 || (deliveryMethod === 'delivery' && !formData.location.lat) || (paymentMethod === "card" && !paymentProvider)}
//             >
//               {checkoutStep !== "idle" && (
//                 <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
//                   <div className="w-full bg-white/20 h-1 absolute bottom-0 left-0">
//                     <div className="h-full bg-white animate-pulse" style={{ width: checkoutStep === 'processing' ? '30%' : checkoutStep === 'verifying' ? '60%' : '90%' }}></div>
//                   </div>
//                 </div>
//               )}
//               {checkoutStep !== "idle" ? <Loader2 className="w-5 h-5 animate-spin relative z-10" /> : null}
//               <span className="relative z-10">{getButtonText()}</span>
//             </Button>
//           </div>
//         </form>
//       </main>

//       {/* Full Screen Map Modal */}
//       <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
//         <DialogContent className="w-full h-[100dvh] max-w-none m-0 p-0 rounded-none sm:rounded-none flex flex-col border-none [&>button.absolute]:hidden bg-white">
//           {/* Top Bar overlay */}
//           <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center pointer-events-none mt-[env(safe-area-inset-top)]">
//             <div className="bg-white/90 backdrop-blur shadow-sm rounded-full px-5 py-2.5 pointer-events-auto border border-slate-100">
//               <span className="font-bold text-slate-800 text-sm">{t('checkout.map_title')}</span>
//             </div>
//             <button
//               onClick={() => setIsMapOpen(false)}
//               className="w-10 h-10 bg-white/90 backdrop-blur shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 pointer-events-auto transition-colors"
//             >
//               <X className="w-5 h-5" />
//             </button>
//           </div>

//           {/* Map Container */}
//           <div className="flex-1 relative bg-slate-100 overflow-hidden">
//             {isLoaded ? (
//               <GoogleMap
//                 mapContainerStyle={{ width: "100%", height: "100%" }}
//                 center={mapCenter}
//                 zoom={15}
//                 options={{
//                   disableDefaultUI: true,
//                   gestureHandling: "greedy",
//                 }}
//                 onLoad={(map) => {
//                   mapRef.current = map;
//                 }}
//                 onIdle={handleIdle}
//               />
//             ) : (
//               <div className="w-full h-full flex items-center justify-center">
//                 <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
//               </div>
//             )}

//             {/* Center Pin Overlay */}
//             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[100%] pointer-events-none drop-shadow-xl z-10 pb-1">
//               <div className="relative">
//                 <MapPin className="w-12 h-12 text-primary fill-primary/10 drop-shadow-md" />
//                 {/* Shadow under pin */}
//                 <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-black/20 rounded-[100%] blur-[2px]" />
//               </div>
//             </div>
//           </div>

//           {/* Bottom Sheet Action */}
//           <div className="bg-white rounded-t-3xl shadow-[0_-20px_40px_rgb(0,0,0,0.08)] p-5 z-20 pb-[calc(1.25rem+env(safe-area-inset-bottom))] relative">
//             <div className="mb-5 flex flex-col gap-1">
//               <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t('checkout.selected_address')}</p>
//               {isGeocoding ? (
//                 <div className="flex items-center gap-2 text-slate-600 h-6">
//                   <Loader2 className="w-4 h-4 animate-spin text-primary" />
//                   <span className="text-sm font-medium">{t('checkout.finding_address')}</span>
//                 </div>
//               ) : (
//                 <p className="text-sm font-semibold text-slate-800 leading-snug min-h-[1.5rem]">
//                   {tempLocation.address || t('checkout.map_hint')}
//                 </p>
//               )}
//             </div>

//             <Button
//               onClick={confirmMapLocation}
//               disabled={isGeocoding || !tempLocation.address}
//               className="w-full h-14 rounded-2xl text-[17px] font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
//             >
//               {t('checkout.confirm_map')}
//             </Button>
//           </div>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }



// src/pages/Checkout

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2, CheckCircle2, MapPin, ChevronDown, Navigation, X, Truck, Store } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GoogleMap, useLoadScript } from "@react-google-maps/api";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { STORE_LOCATION, estimateRoadDistance, calculateDeliveryFee } from "@/lib/delivery";
import { useSettingsStore } from "@/store/settingsStore";
import { useI18nStore } from "@/store/i18nStore";
import { useAuth } from "../context/AuthContext";

// Phone formatter
const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, "");
  let formatted = "+998";

  if (digits.length > 3) {
    formatted += " " + digits.substring(3, 5);
  }
  if (digits.length > 5) {
    formatted += " " + digits.substring(5, 8);
  }
  if (digits.length > 8) {
    formatted += " " + digits.substring(8, 10);
  }
  if (digits.length > 10) {
    formatted += " " + digits.substring(10, 12);
  }

  return formatted;
};

// Uzbekistan regions and districts data
const DISTRICTS: Record<string, string[]> = {
  "Toshkent shahri": ["Bektemir", "Chilonzor", "Yashnobod", "Mirobod", "Mirzo Ulug'bek", "Sergeli", "Shayxontohur", "Olmazor", "Uchtepa", "Yakkasaroy", "Yunusobod", "Yangihayot"],
  "Toshkent viloyati": ["Olmaliq shahri", "Angren shahri", "Bekobod shahri", "Chirchiq shahri", "Nurafshon shahri", "Bekobod tumani", "Bo'stonliq", "Bo'ka", "Qibray", "Zangiota", "Yuqori Chirchiq", "Yangiyo'l", "O'rta Chirchiq", "Parkent"],
  "Samarqand viloyati": ["Samarqand shahri", "Kattaqo'rg'on shahri", "Bulung'ur", "Jomboy", "Ishtixon", "Kattaqo'rg'on", "Narpay", "Nurobod", "Oqdaryo", "Paxtachi", "Payariq", "Pastdarg'om", "Qo'shrabot", "Samarqand tumani", "Tayloq", "Urgut"],
  "Buxoro viloyati": ["Buxoro shahri", "Kogon shahri", "Olot", "Buxoro tumani", "Vobkent", "G'ijduvon", "Jondor", "Kogon tumani", "Qorako'l", "Qorovulbozor", "Peshku", "Romitan", "Shofirkon"],
  "Andijon viloyati": ["Andijon shahri", "Xonabod shahri", "Andijon tumani", "Asaka", "Baliqchi", "Bo'z", "Buloqboshi", "Jalaquduq", "Izboskan", "Qo'rg'ontepa", "Marhamat", "Oltinko'l", "Paxtaobod", "Shaxrixon", "Ulug'nor"],
  "Farg'ona viloyati": ["Farg'ona shahri", "Marg'ilon shahri", "Qo'qon shahri", "Quvasoy shahri", "Oltiariq", "Bag'dod", "Beshariq", "Buvayda", "Dang'ara", "Farg'ona tumani", "Furqat", "Qo'shtepa", "Quva", "Rishton", "So'x", "Toshloq", "Uchko'prik", "Yozyovon"],
  "Namangan viloyati": ["Namangan shahri", "Mingbuloq", "Kosonsoy", "Namangan tumani", "Norin", "Pop", "To'raqo'rg'on", "Uychi", "Uchqo'rg'on", "Chortoq", "Chust", "Yangiqo'rg'on"],
  "Qashqadaryo viloyati": ["Qarshi shahri", "Shahrisabz shahri", "G'uzor", "Dehqonobod", "Qamashi", "Qarshi tumani", "Koson", "Kitob", "Mirishkor", "Muborak", "Nishon", "Kasbi", "Ko'kdala", "Yakkabog'"],
  "Surxondaryo viloyati": ["Termiz shahri", "Angor", "Boysun", "Denov", "Jarqo'rg'on", "Qiziriq", "Qumqo'rg'on", "Muzrabot", "Oltinsoy", "Sariosiyo", "Sherobod", "Sho'rchi", "Termiz tumani", "Uzun"],
  "Xorazm viloyati": ["Urganch shahri", "Xiva shahri", "Bog'ot", "Gurlan", "Qo'shko'pir", "Urganch tumani", "Xazarasp", "Xonqa", "Xiva tumani", "Shovot", "Yangiariq", "Yangibozor"],
  "Navoiy viloyati": ["Navoiy shahri", "Zarafshon shahri", "Karmana", "Qiziltepa", "Xatirchi", "Navbahor", "Nurota", "Tomdi", "Uchquduq"],
  "Jizzax viloyati": ["Jizzax shahri", "Arnasoy", "Baxmal", "Do'stlik", "Forish", "G'allaorol", "Sharof Rashidov", "Mirzacho'l", "Paxtakor", "Yangiobod", "Zomin", "Zafarobod"],
  "Sirdaryo viloyati": ["Guliston shahri", "Yangiyer shahri", "Shirin shahri", "Oqoltin", "Boyovut", "Guliston tumani", "Xavos", "Sirdaryo tumani", "Sayxunobod", "Sardoba", "Mirzaobod"],
  "Qoraqalpog'iston": ["Nukus shahri", "Amudaryo", "Beruniy", "Chimboy", "Ellikqal'a", "Kegeyli", "Mo'ynoq", "Nukus tumani", "Qonliko'l", "Qo'ng'irot", "Qorao'zak", "Shumanay", "Taxtako'pir", "To'rtko'l", "Xo'jayli", "Taxiatosh", "Bo'zatov"]
};
const REGIONS = Object.keys(DISTRICTS);

// Custom Select Component
interface CustomSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

function CustomSelect({ options, value, onChange, placeholder, disabled }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useI18nStore((s) => s.t);

  return (
    <div className={`relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-12 rounded-xl font-semibold bg-slate-50/50 border border-slate-200 px-3 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all hover:bg-slate-50"
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-[0_10px_40px_rgb(0,0,0,0.08)] py-1 max-h-40 overflow-auto animate-in fade-in zoom-in-95 duration-100">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400 text-center">{t('checkout.empty_options')}</div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-slate-50 ${value === opt ? 'bg-primary/5 text-primary font-semibold' : 'text-slate-700'}`}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface LocationData {
  lat: number | null;
  lng: number | null;
  address: string;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isVip = user?.isVip ?? false;
  const { items, clearCart } = useCartStore();
  const t = useI18nStore((s) => s.t);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const USD_TO_UZS = useSettingsStore((s) => s.usdRate);

  const totalUSD = items.reduce((acc, item) => {
    const itemPriceUSD = item.unit === 'item' ? item.price : (item.price / USD_TO_UZS);
    return acc + (itemPriceUSD * item.quantity);
  }, 0);
  const totalUZS = totalUSD * USD_TO_UZS;

  const [checkoutStep, setCheckoutStep] = useState<"idle" | "processing" | "verifying" | "finalizing" | "success">("idle");
  const [finalTotalUZS, setFinalTotalUZS] = useState(0);

  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem("oscar_userData");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          name: parsed.name || "",
          phone: parsed.phone || "+998 ",
          region: parsed.region || "",
          district: parsed.district || "",
          location: parsed.location || { lat: null, lng: null, address: "" },
          fullName: parsed.fullName || "",
        };
      }
    } catch (e) { }
    return {
      name: "",
      phone: "+998 ",
      region: "",
      district: "",
      location: { lat: null, lng: null, address: "" },
      fullName: "",
    };
  });

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [paymentProvider, setPaymentProvider] = useState<"payme" | "uzum" | null>(null);

  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
  const [deliveryFeeData, setDeliveryFeeData] = useState<{ fee: number; isFree: boolean; reason: string; distanceKm: number | null }>({ fee: 0, isFree: false, reason: '', distanceKm: null });

  const deliveryFeeUZS = deliveryMethod === 'pickup' ? 0 : deliveryFeeData.fee;
  const finalTotalUZSWithDelivery = totalUZS + deliveryFeeUZS;
  const deliveryFeeUSD = parseFloat((deliveryFeeUZS / USD_TO_UZS).toFixed(2));
  const finalTotalUSDWithDelivery = parseFloat((totalUSD + deliveryFeeUSD).toFixed(2));

  // Map state
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 41.2995, lng: 69.2401 });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [tempLocation, setTempLocation] = useState<LocationData>({ lat: null, lng: null, address: "" });

  const mapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const geocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedCenterRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("oscar_userData", JSON.stringify(formData));
    } catch (e) { }
  }, [formData]);

  // Update delivery fee data when location changes
  useEffect(() => {
    if (deliveryMethod === 'pickup') return;

    if (formData.location.lat && formData.location.lng) {
      const dist = estimateRoadDistance(STORE_LOCATION.lat, STORE_LOCATION.lng, formData.location.lat, formData.location.lng);
      const feeInfo = calculateDeliveryFee(dist, totalUSD);
      setDeliveryFeeData({ ...feeInfo, distanceKm: dist });
    } else {
      const feeInfo = calculateDeliveryFee(0, totalUSD);
      if (feeInfo.isFree) {
        setDeliveryFeeData({ ...feeInfo, distanceKm: null });
      } else {
        setDeliveryFeeData({ fee: 0, isFree: false, reason: '', distanceKm: null });
      }
    }
  }, [formData.location.lat, formData.location.lng, totalUSD, deliveryMethod]);

  // Initialize Geocoder
  useEffect(() => {
    if (isLoaded && !geocoderRef.current) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
  }, [isLoaded]);

  // Update map center when region/district changes
  useEffect(() => {
    if (!geocoderRef.current || !formData.region) return;

    const query = formData.district
      ? `${formData.region}, ${formData.district}`
      : formData.region;

    geocoderRef.current.geocode({ address: query }, async (results, status) => {
      if (status === "OK" && results && results[0]) {
        const location = results[0].geometry.location;
        const coords = { lat: location.lat(), lng: location.lng() };
        setMapCenter(coords);
        if (mapRef.current) {
          mapRef.current.panTo(coords);
        }
      } else {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Uzbekistan')}`);
          const data = await res.json();
          if (data && data.length > 0) {
            const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            setMapCenter(coords);
            if (mapRef.current) {
              mapRef.current.panTo(coords);
            }
          }
        } catch (e) {
          console.error("OSM Fallback failed:", e);
        }
      }
    });
  }, [formData.region, formData.district]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith("+998")) {
      val = "+998 " + val.replace(/\D/g, "");
    }
    setFormData({ ...formData, phone: formatPhoneNumber(val) });
  };

  const fetchAddress = useCallback((lat: number, lng: number) => {
    if (!geocoderRef.current) return;
    setIsGeocoding(true);

    geocoderRef.current.geocode({ location: { lat, lng } }, async (results, status) => {
      if (status === "OK" && results && results[0]) {
        const address = results[0].formatted_address;
        setTempLocation({ lat, lng, address });
        setIsGeocoding(false);
      } else {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
          const data = await res.json();
          if (data && data.display_name) {
            setTempLocation({ lat, lng, address: data.display_name });
          } else {
            setTempLocation(prev => ({ ...prev, lat, lng, address: "Manzil topilmadi" }));
          }
        } catch (err) {
          setTempLocation(prev => ({ ...prev, lat, lng, address: "Manzil topilmadi" }));
        }
        setIsGeocoding(false);
      }
    });
  }, []);

  const handleIdle = useCallback(() => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    if (!center) return;

    const lat = center.lat();
    const lng = center.lng();

    if (lastFetchedCenterRef.current) {
      const latDiff = Math.abs(lastFetchedCenterRef.current.lat - lat);
      const lngDiff = Math.abs(lastFetchedCenterRef.current.lng - lng);
      if (latDiff < 0.0001 && lngDiff < 0.0001) {
        return;
      }
    }

    lastFetchedCenterRef.current = { lat, lng };

    setTempLocation(prev => ({ ...prev, lat, lng, address: "" }));

    if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    setIsGeocoding(true);

    geocodeTimeoutRef.current = setTimeout(() => {
      fetchAddress(lat, lng);
    }, 6000);
  }, [fetchAddress]);

  const openMap = () => {
    setIsMapOpen(true);

    setTimeout(() => {
      if (mapRef.current) {
        const center = mapRef.current.getCenter();
        if (center) {
          fetchAddress(center.lat(), center.lng());
        }
      } else if (formData.location.lat && formData.location.lng) {
        setMapCenter({ lat: formData.location.lat, lng: formData.location.lng });
      }
    }, 500);
  };

  const confirmMapLocation = () => {
    setFormData(prev => ({ ...prev, location: tempLocation }));
    setIsMapOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutStep !== "idle" || items.length === 0) return;

    if (!isVip) {
      if (!formData.fullName.trim()) {
        alert("Ism familiyani kiriting");
        return;
      }
      if (formData.phone.replace(/\D/g, "").length < 12) {
        alert("Telefon raqamni to'liq kiriting.");
        return;
      }
    }

    if (deliveryMethod === 'delivery' && (!formData.location.lat || !formData.location.lng || !formData.location.address)) {
      alert("Iltimos, xaritadan manzilni tanlang va tasdiqlang.");
      return;
    }

    if (!isVip && paymentMethod === "card" && !paymentProvider) {
      alert("Iltimos, to'lov tizimini tanlang.");
      return;
    }

    setCheckoutStep("processing");

    let telegramChatId = null;
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.initDataUnsafe?.user?.id) {
        telegramChatId = tg.initDataUnsafe.user.id;
      }
    } catch (e) { }

    const now = new Date().toISOString();

    const baseOrderData = {
      region: formData.region,
      district: formData.district,
      location: {
        lat: formData.location.lat,
        lng: formData.location.lng,
        address: formData.location.address,
      },
      items: items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        discount: item.discount,
        quantity: item.quantity,
        unit: item.unit,
      })),
      totalUSD: finalTotalUSDWithDelivery,
      totalUZS: finalTotalUZSWithDelivery,
      deliveryMethod,
      deliveryFee: deliveryFeeUZS,
      deliveryFeeUsd: deliveryFeeUSD,
      distanceKm: deliveryMethod === 'pickup' ? null : (deliveryFeeData.distanceKm ? Number(deliveryFeeData.distanceKm.toFixed(1)) : null),
      deliveryAddress: deliveryMethod === 'pickup' ? null : formData.location.address,
      deliveryCoords: deliveryMethod === 'pickup' ? null : { lat: formData.location.lat, lng: formData.location.lng },
      telegramChatId,
      status: "pending",
      paymentStatus: "pending",
      paidAt: null,
      cancelledAt: null,
      transactionId: null,
      createdAt: now,
      updatedAt: now,
    };

    let orderId = "";

    try {
      const docRef = await addDoc(collection(db, "orders"), {
        ...baseOrderData,
        ...(isVip
          ? { username: user?.username, isVip: true }
          : { customerName: formData.fullName, customerPhone: formData.phone, isVip: false }
        ),
        paymentMethod: isVip ? "kelishamiz" : paymentMethod,
        paymentProvider: isVip ? null : (paymentProvider || null),
      });
      orderId = docRef.id;

      if (!isVip && paymentMethod === "card") {
        if (paymentProvider === "payme") {
          const merchantId = import.meta.env.VITE_PAYME_MERCHANT_ID;
          const amountTiyin = Math.round(finalTotalUZSWithDelivery * 100);
          const params = `m=${merchantId};ac.order_id=${orderId};a=${amountTiyin}`;
          const base64Params = btoa(params);
          window.open(`https://checkout.paycom.uz/${base64Params}`, "_blank");
        } else if (paymentProvider === "uzum") {
          window.open("https://www.apelsin.uz/open-service?serviceId=498609633", "_blank");
        }
      }
    } catch (error) {
      console.error("Order saqlashda xato:", error);
    }

    if (telegramChatId && formData.phone) {
      try {
        const { doc: firestoreDoc, setDoc } = await import("firebase/firestore");
        await setDoc(firestoreDoc(db, "telegram_users", String(telegramChatId)), {
          chatId: telegramChatId,
          phone: formData.phone.replace(/\s/g, ""),
        }, { merge: true });
      } catch (e) {
        console.error("telegram_users saqlashda xato:", e);
      }
    }

    setFinalTotalUZS(finalTotalUZSWithDelivery);
    setCheckoutStep("success");
    clearCart();

    setTimeout(() => {
      navigate("/");
    }, 6000);
  };

  // CheckoutMerged.tsx faylida success qismini o'zgartiring:

  if (checkoutStep === "success") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">
          {isVip ? t('checkout.vip_success_title') : (paymentMethod === "card" ? t('checkout.success_card') : t('checkout.success_title'))}
        </h1>
        <p className="text-slate-500 mb-8 max-w-[280px]">
          {isVip ? t('checkout.vip_success_desc') : (paymentMethod === "card" ? t('checkout.success_desc_card') : t('checkout.success_desc'))}
        </p>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 w-full max-w-sm mb-8">
          <p className="text-sm text-slate-500 font-medium mb-1">{t('checkout.success_amount')}</p>
          <p className="text-2xl font-black text-slate-800">{finalTotalUZS.toLocaleString("uz-UZ")} so'm</p>
        </div>
        <Button
          onClick={() => {
            console.log("Navigating to home...");
            navigate("/");
          }}
          className="w-full max-w-sm h-14 rounded-2xl text-lg font-bold"
        >
          {t('checkout.back_home')}
        </Button>
      </div>
    );
  }

  const getButtonText = () => {
    if (checkoutStep !== "idle") return t('checkout.loading');
    return t('checkout.submit');
  };

  const availableDistricts = formData.region ? DISTRICTS[formData.region] || [] : [];

  return (
    <div className="min-h-screen bg-slate-50 pb-[160px]">
      <div className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b">
        <div className="container flex h-14 items-center px-4 max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 transition-colors -ml-2"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="ml-2 font-semibold text-lg">{t('checkout.title')}</h1>
        </div>
      </div>

      <main className="container px-4 pt-6 max-w-2xl mx-auto">
        {/* Buyurtma ma'lumotlari */}
        <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 mb-6">
          <h3 className="font-semibold text-slate-800 mb-4">{t('checkout.order_info')}</h3>
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div key={item.cartItemId} className="flex justify-between text-sm">
                <span className="text-slate-600 truncate pr-2">
                  {item.quantity} x {item.name} ({item.unit === 'box' ? t('checkout.box') : t('checkout.item')})
                </span>
                <span className="font-medium text-slate-800 whitespace-nowrap">
                  {item.unit === 'item' ? `$${(item.quantity * item.price).toFixed(2)}` : `${(item.quantity * item.price).toLocaleString("uz-UZ")} UZS`}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t flex flex-col gap-2 font-bold text-sm">
            <div className="flex justify-between items-center text-slate-600 font-medium">
              <span>{t('checkout.products')}:</span>
              <span>{totalUZS.toLocaleString("uz-UZ")} so'm ≈ ${totalUSD.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-start text-slate-600 font-medium pb-2 border-b border-dashed border-slate-200">
              <span>{t('checkout.delivery_fee')}:</span>
              <div className="flex flex-col items-end text-right">
                {deliveryMethod === 'pickup' ? (
                  <span className="text-primary font-bold">{t('checkout.pickup_free')}</span>
                ) : (
                  deliveryMethod === 'delivery' && deliveryFeeData.isFree ? (
                    <>
                      <span className="text-primary font-bold">
                        {deliveryFeeData.reason === 'order_over_threshold' ? t('checkout.free_order') : t('checkout.free')}
                      </span>
                      {deliveryFeeData.distanceKm !== null && (
                        <span className="text-xs text-slate-400 line-through mt-0.5 font-normal">
                          ~~{(calculateDeliveryFee(deliveryFeeData.distanceKm, 0).fee).toLocaleString("uz-UZ")} so'm ≈ ${(calculateDeliveryFee(deliveryFeeData.distanceKm, 0).fee / USD_TO_UZS).toFixed(2)}~~
                        </span>
                      )}
                    </>
                  ) : (
                    deliveryFeeData.distanceKm === null ? (
                      <span className="text-slate-400 font-normal">{t('checkout.select_address')}</span>
                    ) : (
                      <>
                        <span className="text-slate-800">
                          {deliveryFeeData.fee.toLocaleString("uz-UZ")} so'm ≈ ${parseFloat((deliveryFeeData.fee / USD_TO_UZS).toFixed(2))}
                        </span>
                        <span className="text-xs text-slate-500 font-normal mt-0.5">
                          {t('checkout.distance')}: ~{deliveryFeeData.distanceKm.toFixed(1)} km
                        </span>
                      </>
                    )
                  )
                )}
              </div>
            </div>

            <div className="flex justify-between items-center mt-2">
              <span>{t('checkout.total')}:</span>
              <div className="flex flex-col items-end">
                <span className="text-primary text-xl font-black">{finalTotalUZSWithDelivery.toLocaleString("uz-UZ")} so'm</span>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">≈ ${finalTotalUSDWithDelivery.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shaxsiy ma'lumotlar - faqat Guest uchun */}
          {!isVip && (
            <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 space-y-4">
              <h3 className="font-semibold text-slate-800 mb-3">{t('checkout.personal')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 ml-1 mb-1.5 block uppercase tracking-wider">{t('checkout.name')}</label>
                  <Input required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} placeholder={t('checkout.name')} className="h-12 rounded-xl bg-slate-50/50 border-slate-200" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 ml-1 mb-1.5 block uppercase tracking-wider">{t('checkout.phone')}</label>
                  <Input required value={formData.phone} onChange={handlePhoneChange} type="tel" placeholder="+998 90 123 45 67" className="h-12 rounded-xl bg-slate-50/50 border-slate-200 font-medium tracking-wide" />
                </div>
              </div>
            </div>
          )}

          {/* VIP ma'lumotlari */}
          {isVip && (
            <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl">
                <span className="text-2xl">👑</span>
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">{t('checkout.vip_label')}</p>
                  <p className="font-semibold text-slate-800">@{user?.username}</p>
                </div>
              </div>
            </div>
          )}

          {/* To'lov usuli */}
          <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 space-y-4">
            <h3 className="font-semibold text-slate-800 mb-3">{t('checkout.payment')}</h3>

            {isVip ? (
              /* VIP — faqat "Kelishamiz" */
              <div className="p-4 bg-slate-50 rounded-xl flex items-center gap-3">
                <span className="text-2xl">🤝</span>
                <div>
                  <strong className="block text-slate-800">{t('checkout.kelishamiz')}</strong>
                  <small className="text-slate-500 text-xs">{t('checkout.kelishamiz_desc')}</small>
                </div>
              </div>
            ) : (
              /* Guest — Naqd / Karta */
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`h-12 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${paymentMethod === "cash" ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                  >
                    {t('checkout.cash')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`h-12 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${paymentMethod === "card" ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                  >
                    {t('checkout.card')}
                  </button>
                </div>

                {/* Payment Providers */}
                <div className={`overflow-hidden transition-all duration-300 ${paymentMethod === 'card' ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                  <p className="text-xs font-bold text-slate-500 ml-1 mb-2 block uppercase tracking-wider">{t('checkout.payment_system')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentProvider("payme")}
                      className={`h-14 rounded-xl font-bold transition-all border-2 flex items-center justify-center overflow-hidden ${paymentProvider === "payme" ? 'border-[#33cccc] bg-[#33cccc]/10' : 'border-slate-100 hover:bg-slate-50'}`}
                    >
                      <span className="text-[#33cccc] font-black text-lg tracking-wide">Payme</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentProvider("uzum")}
                      className={`h-14 rounded-xl font-bold transition-all border-2 flex items-center justify-center overflow-hidden ${paymentProvider === "uzum" ? 'border-[#5c00e6] bg-[#5c00e6]/10' : 'border-slate-100 hover:bg-slate-50'}`}
                    >
                      <span className="text-[#5c00e6] font-black text-lg tracking-wide">Uzum</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Yetkazib berish usuli */}
          <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 space-y-4">
            <h3 className="font-semibold text-slate-800 mb-3">{t('checkout.delivery')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryMethod("delivery")}
                className={`h-12 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${deliveryMethod === "delivery" ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}
              >
                <Truck className="w-4 h-4" />
                {t('checkout.delivery_btn')}
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMethod("pickup")}
                className={`h-12 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${deliveryMethod === "pickup" ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}
              >
                <Store className="w-4 h-4" />
                {t('checkout.pickup')}
              </button>
            </div>
          </div>

          {/* Manzil (faqat delivery uchun) */}
          {deliveryMethod === 'delivery' ? (
            <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 space-y-4">
              <h3 className="font-semibold text-slate-800 mb-3">{t('checkout.address')}</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 ml-1 mb-1.5 block uppercase tracking-wider">{t('checkout.region')}</label>
                    <CustomSelect
                      value={formData.region}
                      onChange={(val) => setFormData({ ...formData, region: val, district: "" })}
                      options={REGIONS}
                      placeholder={t('checkout.select_region')}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 ml-1 mb-1.5 block uppercase tracking-wider">{t('checkout.district')}</label>
                    <CustomSelect
                      value={formData.district}
                      onChange={(val) => setFormData({ ...formData, district: val })}
                      options={availableDistricts}
                      placeholder={t('checkout.select_district')}
                      disabled={!formData.region}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  {formData.location.address ? (
                    <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{t('checkout.selected_address')}</p>
                        <p className="text-sm font-medium text-slate-800 leading-snug">{formData.location.address}</p>
                      </div>
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openMap}
                    className="w-full h-12 rounded-xl text-[15px] font-bold border-2 border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 transition-all active:scale-95"
                  >
                    <Navigation className="w-4 h-4 text-slate-500" />
                    {formData.location.address ? t('checkout.change_map') : t('checkout.select_map')}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 space-y-4">
              <h3 className="font-semibold text-slate-800 mb-3">{t('checkout.pickup_address')}</h3>
              <div className="mb-1 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800 leading-snug">{STORE_LOCATION.name}</p>
                  <p className="text-xs text-slate-500 font-medium mt-1 mb-2">{t('checkout.pickup_info')}</p>
                  <a href={STORE_LOCATION.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/5 px-2.5 py-1.5 rounded-lg w-fit">
                    📍 {t('checkout.view_map')}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 p-4 bg-white/95 backdrop-blur-sm border-t pb-8 z-30 max-w-2xl mx-auto shadow-[0_-10px_40px_rgb(0,0,0,0.05)]">
            <Button
              type="submit"
              className="w-full h-14 rounded-2xl text-lg font-bold active:scale-95 transition-all flex items-center justify-center gap-2 overflow-hidden relative"
              disabled={checkoutStep !== "idle" || items.length === 0 || (deliveryMethod === 'delivery' && !formData.location.lat) || (!isVip && paymentMethod === "card" && !paymentProvider)}
            >
              {checkoutStep !== "idle" && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <div className="w-full bg-white/20 h-1 absolute bottom-0 left-0">
                    <div className="h-full bg-white animate-pulse" style={{ width: checkoutStep === 'processing' ? '30%' : checkoutStep === 'verifying' ? '60%' : '90%' }}></div>
                  </div>
                </div>
              )}
              {checkoutStep !== "idle" ? <Loader2 className="w-5 h-5 animate-spin relative z-10" /> : null}
              <span className="relative z-10">{getButtonText()}</span>
            </Button>
          </div>
        </form>
      </main>

      {/* Full Screen Map Modal */}
      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
        <DialogContent className="w-full h-[100dvh] max-w-none m-0 p-0 rounded-none sm:rounded-none flex flex-col border-none [&>button.absolute]:hidden bg-white">
          {/* Top Bar overlay */}
          <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center pointer-events-none mt-[env(safe-area-inset-top)]">
            <div className="bg-white/90 backdrop-blur shadow-sm rounded-full px-5 py-2.5 pointer-events-auto border border-slate-100">
              <span className="font-bold text-slate-800 text-sm">{t('checkout.map_title')}</span>
            </div>
            <button
              onClick={() => setIsMapOpen(false)}
              className="w-10 h-10 bg-white/90 backdrop-blur shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 pointer-events-auto transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Map Container */}
          <div className="flex-1 relative bg-slate-100 overflow-hidden">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={mapCenter}
                zoom={15}
                options={{
                  disableDefaultUI: true,
                  gestureHandling: "greedy",
                }}
                onLoad={(map) => {
                  mapRef.current = map;
                }}
                onIdle={handleIdle}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            )}

            {/* Center Pin Overlay */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[100%] pointer-events-none drop-shadow-xl z-10 pb-1">
              <div className="relative">
                <MapPin className="w-12 h-12 text-primary fill-primary/10 drop-shadow-md" />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-black/20 rounded-[100%] blur-[2px]" />
              </div>
            </div>
          </div>

          {/* Bottom Sheet Action */}
          <div className="bg-white rounded-t-3xl shadow-[0_-20px_40px_rgb(0,0,0,0.08)] p-5 z-20 pb-[calc(1.25rem+env(safe-area-inset-bottom))] relative">
            <div className="mb-5 flex flex-col gap-1">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t('checkout.selected_address')}</p>
              {isGeocoding ? (
                <div className="flex items-center gap-2 text-slate-600 h-6">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">{t('checkout.finding_address')}</span>
                </div>
              ) : (
                <p className="text-sm font-semibold text-slate-800 leading-snug min-h-[1.5rem]">
                  {tempLocation.address || t('checkout.map_hint')}
                </p>
              )}
            </div>

            <Button
              onClick={confirmMapLocation}
              disabled={isGeocoding || !tempLocation.address}
              className="w-full h-14 rounded-2xl text-[17px] font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              {t('checkout.confirm_map')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}