import { useRoute } from "wouter";
import { useGetHospital, getGetHospitalQueryKey } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BloodStatusBadge } from "@/lib/blood-utils";
import { MapPin, Phone, Mail, Globe, Clock, Building2, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestBloodDialog } from "@/components/request-blood-dialog";

export default function HospitalDetail() {
  const [, params] = useRoute("/hospitals/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  
  const { data: hospital, isLoading, error } = useGetHospital(id, {
    query: { enabled: !!id, queryKey: getGetHospitalQueryKey(id) }
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex justify-center items-center h-64">Loading hospital details...</div>
      </PublicLayout>
    );
  }

  if (error || !hospital) {
    return (
      <PublicLayout>
        <div className="flex justify-center items-center h-64 text-destructive">Hospital not found</div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col md:flex-row gap-6 mb-8 items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{hospital.name}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><Building2 className="w-4 h-4" /> {hospital.type} ({hospital.ownership})</span>
              <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><MapPin className="w-4 h-4" /> {hospital.city}, {hospital.district}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <RequestBloodDialog hospitalId={hospital.id} hospitalName={hospital.name} />
            {hospital.contactNumber && (
              <a href={`tel:${hospital.contactNumber}`}>
                <Button variant="outline" className="gap-2"><Phone className="w-4 h-4" /> Call Now</Button>
              </a>
            )}
            {hospital.googleMapsLat && hospital.googleMapsLng && (
              <a href={`https://www.google.com/maps?q=${hospital.googleMapsLat},${hospital.googleMapsLng}`} target="_blank" rel="noreferrer">
                <Button variant="outline" className="gap-2"><Map className="w-4 h-4" /> Directions</Button>
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Blood Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {hospital.bloodInventory?.map(item => (
                    <div key={item.id} className="border rounded-lg p-4 text-center bg-gray-50 flex flex-col items-center">
                      <div className="text-2xl font-bold text-primary mb-1">{item.bloodGroup}</div>
                      <div className="text-xl font-semibold mb-2">{item.units} <span className="text-sm text-gray-500 font-normal">units</span></div>
                      <BloodStatusBadge units={item.units} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    {hospital.address}
                    {hospital.pinCode && `, ${hospital.pinCode}`}
                  </div>
                </div>
                {hospital.contactNumber && (
                  <div className="flex gap-3 items-center">
                    <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                    <div className="text-sm">{hospital.contactNumber}</div>
                  </div>
                )}
                {hospital.email && (
                  <div className="flex gap-3 items-center">
                    <Mail className="w-5 h-5 text-gray-400 shrink-0" />
                    <div className="text-sm">{hospital.email}</div>
                  </div>
                )}
                {hospital.website && (
                  <div className="flex gap-3 items-center">
                    <Globe className="w-5 h-5 text-gray-400 shrink-0" />
                    <a href={hospital.website} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">{hospital.website}</a>
                  </div>
                )}
                {hospital.workingHours && (
                  <div className="flex gap-3 items-center">
                    <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                    <div className="text-sm">{hospital.workingHours}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
