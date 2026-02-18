/**
 * Rentvine API Client
 *
 * This client wraps the Rentvine REST API. The exact endpoints and auth
 * mechanism may need adjustment based on Rentvine's current API docs.
 * The structure is designed to be easy to update as the API evolves.
 */

interface RentvineRequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
}

export class RentvineClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(apiKey: string, apiSecret: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(endpoint: string, options: RentvineRequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params } = options;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`,
    };

    const response = await fetch(url, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Rentvine API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  private async getPaginated<T>(endpoint: string): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.request<{ data: T[]; meta?: { current_page: number; last_page: number } }>(
        endpoint,
        { params: { page: String(page), per_page: '100' } },
      );

      const items = Array.isArray(response) ? response : (response.data || []);
      allItems.push(...items);

      if (response.meta && response.meta.current_page < response.meta.last_page) {
        page++;
      } else if (Array.isArray(response) || !response.meta) {
        // If no pagination info, assume single page
        hasMore = false;
      } else {
        hasMore = false;
      }
    }

    return allItems;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getProperties(): Promise<any[]> {
    return this.getPaginated('/v1/properties');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getUnits(): Promise<any[]> {
    return this.getPaginated('/v1/units');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTenants(): Promise<any[]> {
    return this.getPaginated('/v1/tenants');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getMaintenanceRequests(): Promise<any[]> {
    return this.getPaginated('/v1/maintenance-requests');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTransactions(): Promise<any[]> {
    return this.getPaginated('/v1/transactions');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getOwners(): Promise<any[]> {
    return this.getPaginated('/v1/owners');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getProperty(id: string): Promise<any> {
    return this.request(`/v1/properties/${id}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTenant(id: string): Promise<any> {
    return this.request(`/v1/tenants/${id}`);
  }
}
