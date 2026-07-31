import { useEffect, useState } from "react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout";
import { useGetPublicStats, useSearchHospitals } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BloodStatusBadge, BLOOD_GROUPS } from "@/lib/blood-utils";
import { Droplet, Hospital, MapPin, Search } from "lucide-react";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetPublicStats();

  const [searchParams, setSearchParams] = useState({
    city: "",
    bloodGroup: "",
    search: "",
  });

  // Debounce so we don't fire a request on every keystroke.
  const [debouncedParams, setDebouncedParams] = useState(searchParams);
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedParams(searchParams), 400);
    return () => clearTimeout(timeout);
  }, [searchParams]);

  const { data: hospitals, isLoading: searchLoading } = useSearchHospitals(
    debouncedParams,
    { query: { queryKey: ["searchHospitals", debouncedParams] } }
  );

  return (
    <PublicLayout>
      <div className="bg-primary text-primary-foreground py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Real-time Blood Availability in Punjab
            </h1>
            <p className="text-lg md:text-xl opacity-90 mb-8 max-w-xl">
              Locate available blood units across verified government and private hospitals in emergency situations.
            </p>
          </div>
          
          <Card className="shadow-xl bg-white text-foreground">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <Input 
                    placeholder="Hospital name..." 
                    value={searchParams.search}
                    onChange={(e) => setSearchParams({ ...searchParams, search: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <Input 
                    placeholder="E.g. Ludhiana" 
                    value={searchParams.city}
                    onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Blood Group</label>
                  <Select 
                    value={searchParams.bloodGroup} 
                    onValueChange={(val) => setSearchParams({ ...searchParams, bloodGroup: val === "all" ? "" : val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Group</SelectItem>
                      {BLOOD_GROUPS.map((bg) => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button className="w-full gap-2 font-semibold h-10">
                    <Search className="w-4 h-4" />
                    Search Banks
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {!statsLoading && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="bg-white p-6 rounded-lg border shadow-sm text-center">
              <div className="text-3xl font-bold text-primary mb-1">{stats.totalHospitals + stats.totalBloodBanks}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Centers</div>
            </div>
            <div className="bg-white p-6 rounded-lg border shadow-sm text-center">
              <div className="text-3xl font-bold text-primary mb-1">{stats.availableBloodUnits}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Units Available</div>
            </div>
            <div className="bg-white p-6 rounded-lg border shadow-sm text-center">
              <div className="text-3xl font-bold text-primary mb-1">{stats.citiesServed}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Cities</div>
            </div>
            <div className="bg-white p-6 rounded-lg border shadow-sm text-center">
              <div className="text-3xl font-bold text-primary mb-1">{stats.districtsServed}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Districts</div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Search Results</h2>
          {searchLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {hospitals?.map((hospital) => (
                <Card key={hospital.id} className="flex flex-col hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-4">
                      <CardTitle className="text-lg leading-tight">{hospital.name}</CardTitle>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-2">
                      <span className="flex items-center gap-1"><Hospital className="w-3 h-3" /> {hospital.type}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {hospital.city}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {hospital.bloodInventory?.slice(0, 4).map((item) => (
                        <div key={item.id} className="text-center p-2 rounded bg-gray-50 border">
                          <div className="font-bold text-sm text-primary">{item.bloodGroup}</div>
                          <div className="text-xs text-muted-foreground">{item.units}u</div>
                        </div>
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {hospital.address}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 border-t bg-gray-50/50">
                    <Link href={`/hospitals/${hospital.id}`} className="w-full">
                      <Button variant="secondary" className="w-full font-semibold">View Details</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
              {hospitals?.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground bg-white border rounded-lg">
                  No hospitals found matching your criteria.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
