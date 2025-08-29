export interface DataCenter {
  key: string
  latitude: number
  longitude: number
  name: string
  node_providers: number
  owner: string
  region: string
  total_nodes: number
  total_replica_nodes: number
  total_api_boundary_nodes:number
  subnets:number
}

export interface CountryFeature {
  type: string
  properties: {
    NAME: string
  }
  geometry: {
    type: string
    coordinates: number[][][]
  }
}

export interface MetricsData {
  totalSubnets: number
  totalNodes: number
  totalNodeProviders: number
  totalDataCenters: number
  totalCountries: number
  totalRegions: number
  totalDCOwners: number
}
