'use client';

import { Users, CheckCircle } from 'lucide-react';
import { getVehicles } from '@/lib/data';

interface VehicleCardsProps {
  fromName?: string;
  toName?: string;
  priceSaloon?: number;
  priceSuv?: number;
  priceTempo?: number;
  distance?: number;
  cityName?: string;
}

export default function VehicleCards({ fromName, toName, priceSaloon, priceSuv, priceTempo, distance, cityName }: VehicleCardsProps) {
  const vehicles = getVehicles().filter(v => v.id !== 'wedding');
  const isRoute = !!fromName && !!toName;
  const context = isRoute ? `${fromName} to ${toName}` : cityName ? `in ${cityName}` : '';

  function getPrice(vehicleId: string): string {
    if (!isRoute || !distance) return '';
    if (vehicleId === 'sedan' && priceSaloon) return `₹${priceSaloon}`;
    if (vehicleId === 'suv' && priceSuv) return `₹${priceSuv}`;
    if (vehicleId === 'tempo' && priceTempo) return `₹${priceTempo}`;
    const v = vehicles.find(x => x.id === vehicleId);
    return v ? `₹${Math.round(distance * v.pricePerKm)}` : '';
  }

  function handleSelect(vehicleId: string) {
    window.dispatchEvent(new CustomEvent('selectVehicle', { detail: { vehicle: vehicleId } }));
    const el = document.getElementById('booking-form');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-secondary mb-2">
            {isRoute ? <>Choose Your Vehicle — <span className="text-gradient">{fromName} to {toName}</span></> : <>Our <span className="text-gradient">Fleet</span>{context ? ` — ${context}` : ''}</>}
          </h2>
          <p className="text-gray-500 text-sm">
            {isRoute
              ? `Select a vehicle below to book your ${distance} km journey`
              : `Select a vehicle to book now${context ? ` ${context}` : ''}`}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {vehicles.map((vehicle) => {
            const price = getPrice(vehicle.id);
            return (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => handleSelect(vehicle.id)}
                className="group bg-white rounded-2xl border border-gray-100 p-4 text-left shadow-sm hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all cursor-pointer"
              >
                <h3 className="text-base font-bold text-secondary group-hover:text-primary transition-colors">{vehicle.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{vehicle.models.slice(0, 2).join(', ')}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                    <Users size={10} /> {vehicle.capacity}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                    <CheckCircle size={10} /> AC
                  </span>
                </div>
                {price ? (
                  <p className="text-lg font-extrabold text-primary mt-3">{price}</p>
                ) : (
                  <p className="text-lg font-extrabold text-primary mt-3">₹{vehicle.pricePerKm}<span className="text-xs text-gray-400 font-normal">/km</span></p>
                )}
                <span className="mt-2 inline-block w-full text-center px-3 py-2 bg-primary/10 text-primary text-xs font-bold rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                  Book Now
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
