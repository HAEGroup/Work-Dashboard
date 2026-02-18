import { useEffect, useState } from 'react';
import { Building2, Users, Wrench, RefreshCw, Search, ChevronRight, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import type { RentvineProperty, RentvineTenant, RentvineMaintenanceRequest } from '../types';
import PageHeader from '../components/shared/PageHeader';
import LoadingSpinner from '../components/shared/LoadingSpinner';

type Tab = 'properties' | 'tenants' | 'maintenance';

export default function PropertiesPage() {
  const [tab, setTab] = useState<Tab>('properties');
  const [properties, setProperties] = useState<RentvineProperty[]>([]);
  const [tenants, setTenants] = useState<RentvineTenant[]>([]);
  const [maintenance, setMaintenance] = useState<RentvineMaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<RentvineProperty | null>(null);

  useEffect(() => {
    loadData();
  }, [tab]);

  async function loadData() {
    setLoading(true);
    try {
      if (tab === 'properties') {
        const { data } = await api.get('/rentvine/properties', { params: search ? { search } : {} });
        setProperties(data.properties);
      } else if (tab === 'tenants') {
        const { data } = await api.get('/rentvine/tenants', { params: search ? { search } : {} });
        setTenants(data.tenants);
      } else {
        const { data } = await api.get('/rentvine/maintenance');
        setMaintenance(data.requests);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function syncRentvine() {
    setSyncing(true);
    try {
      const { data } = await api.post('/rentvine/sync');
      console.log('Sync results:', data.results);
      loadData();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  }

  async function openProperty(id: string) {
    try {
      const { data } = await api.get(`/rentvine/properties/${id}`);
      setSelectedProperty(data.property);
    } catch (err) {
      console.error('Failed to load property:', err);
    }
  }

  return (
    <div>
      <PageHeader
        title="Properties"
        description="Rentvine property management data"
        actions={
          <button onClick={syncRentvine} className="btn-primary" disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Rentvine'}
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {[
          { key: 'properties' as Tab, label: 'Properties', icon: Building2 },
          { key: 'tenants' as Tab, label: 'Tenants', icon: Users },
          { key: 'maintenance' as Tab, label: 'Maintenance', icon: Wrench },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSelectedProperty(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
              tab === key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Search */}
      {(tab === 'properties' || tab === 'tenants') && (
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder={`Search ${tab}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadData()}
          />
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Properties */}
          {tab === 'properties' && (
            <>
              <div className={selectedProperty ? 'lg:col-span-1' : 'lg:col-span-3'}>
                {properties.length === 0 ? (
                  <div className="card card-body text-center py-12">
                    <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No properties synced yet. Click Sync Rentvine to import.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {properties.map(prop => (
                      <div
                        key={prop.id}
                        onClick={() => openProperty(prop.id)}
                        className={`card card-body cursor-pointer hover:shadow-md transition-shadow ${
                          selectedProperty?.id === prop.id ? 'ring-2 ring-primary-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">{prop.name}</h3>
                            {prop.address && (
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" />
                                {prop.address}{prop.city ? `, ${prop.city}` : ''}{prop.state ? ` ${prop.state}` : ''} {prop.zip}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-300" />
                        </div>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          {prop.units && <span>{prop.units.length} units</span>}
                          {prop._count && <span>{prop._count.tenants} tenants</span>}
                          {prop._count && <span>{prop._count.maintenanceRequests} requests</span>}
                          {prop.status && <span className="badge-gray">{prop.status}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Property detail */}
              {selectedProperty && (
                <div className="lg:col-span-2 space-y-4">
                  <div className="card">
                    <div className="card-header">
                      <h2 className="text-lg font-semibold">{selectedProperty.name}</h2>
                      {selectedProperty.address && (
                        <p className="text-sm text-gray-500">{selectedProperty.address}, {selectedProperty.city} {selectedProperty.state} {selectedProperty.zip}</p>
                      )}
                    </div>
                    <div className="card-body grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{selectedProperty.units?.length || 0}</p>
                        <p className="text-xs text-gray-500">Units</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{selectedProperty._count?.tenants || 0}</p>
                        <p className="text-xs text-gray-500">Tenants</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{selectedProperty._count?.maintenanceRequests || 0}</p>
                        <p className="text-xs text-gray-500">Requests</p>
                      </div>
                    </div>
                  </div>

                  {/* Units */}
                  {selectedProperty.units && selectedProperty.units.length > 0 && (
                    <div className="card">
                      <div className="card-header"><h3 className="font-semibold">Units</h3></div>
                      <div className="overflow-x-auto">
                        <table className="table w-full">
                          <thead>
                            <tr><th>Name</th><th>Beds</th><th>Baths</th><th>Sqft</th><th>Rent</th><th>Status</th></tr>
                          </thead>
                          <tbody>
                            {selectedProperty.units.map(unit => (
                              <tr key={unit.id}>
                                <td className="font-medium">{unit.name}</td>
                                <td>{unit.bedrooms || '-'}</td>
                                <td>{unit.bathrooms || '-'}</td>
                                <td>{unit.sqft ? `${unit.sqft}` : '-'}</td>
                                <td>{unit.rent ? `$${Number(unit.rent).toLocaleString()}` : '-'}</td>
                                <td>{unit.status ? <span className="badge-gray">{unit.status}</span> : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Tenants */}
          {tab === 'tenants' && (
            <div className="lg:col-span-3">
              <div className="card">
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr><th>Name</th><th>Property</th><th>Unit</th><th>Email</th><th>Phone</th><th>Lease Period</th><th>Rent</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {tenants.length === 0 ? (
                        <tr><td colSpan={8} className="text-center text-gray-500 py-8">No tenants</td></tr>
                      ) : tenants.map(tenant => (
                        <tr key={tenant.id}>
                          <td className="font-medium">{tenant.firstName} {tenant.lastName}</td>
                          <td className="text-gray-500">{tenant.property?.name || '-'}</td>
                          <td className="text-gray-500">{tenant.unit?.name || '-'}</td>
                          <td className="text-gray-500">{tenant.email || '-'}</td>
                          <td className="text-gray-500">{tenant.phone || '-'}</td>
                          <td className="text-gray-500 text-xs">
                            {tenant.leaseStart ? format(new Date(tenant.leaseStart), 'MMM d, yyyy') : '?'}
                            {' - '}
                            {tenant.leaseEnd ? format(new Date(tenant.leaseEnd), 'MMM d, yyyy') : '?'}
                          </td>
                          <td>{tenant.rentAmount ? `$${Number(tenant.rentAmount).toLocaleString()}` : '-'}</td>
                          <td>{tenant.status ? <span className="badge-gray">{tenant.status}</span> : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Maintenance */}
          {tab === 'maintenance' && (
            <div className="lg:col-span-3">
              <div className="card">
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr><th>Title</th><th>Property</th><th>Priority</th><th>Status</th><th>Requested By</th><th>Assigned To</th><th>Created</th></tr>
                    </thead>
                    <tbody>
                      {maintenance.length === 0 ? (
                        <tr><td colSpan={7} className="text-center text-gray-500 py-8">No maintenance requests</td></tr>
                      ) : maintenance.map(req => (
                        <tr key={req.id}>
                          <td className="font-medium">{req.title}</td>
                          <td className="text-gray-500">{req.property?.name || '-'}</td>
                          <td>
                            {req.priority ? (
                              <span className={`badge ${req.priority === 'high' || req.priority === 'urgent' ? 'badge-red' : req.priority === 'medium' ? 'badge-yellow' : 'badge-gray'}`}>
                                {req.priority}
                              </span>
                            ) : '-'}
                          </td>
                          <td>{req.status ? <span className="badge-blue">{req.status}</span> : '-'}</td>
                          <td className="text-gray-500">{req.requestedBy || '-'}</td>
                          <td className="text-gray-500">{req.assignedTo || '-'}</td>
                          <td className="text-gray-500 text-xs">{format(new Date(req.createdAt), 'MMM d, yyyy')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
