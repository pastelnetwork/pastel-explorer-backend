import axios from 'axios';

class GeolocalisationService {
  private getIpLocateUrl(ip: string): string {
    return `https://www.iplocate.io/api/lookup/${ip}`;
  }
  private getApApiUrl(ip: string): string {
    return `https://api.sefinek.net/api/v2/geoip/${ip}`;
  }
  async getGeoData(ip: string): Promise<GeoData> {
    try {
      const { data: geoData } = await axios.get<GeoApiData>(
        this.getIpLocateUrl(ip),
      );
      return {
        city: geoData.city || 'N/A',
        country: geoData.country || 'N/A',
        latitude: geoData.latitude,
        longitude: geoData.longitude,
      };
    } catch {
      const { data: geoData } = await axios.get<GeoApiApiData>(
        this.getApApiUrl(ip),
      );
      return {
        city: geoData.data.city || 'N/A',
        country: geoData.data.country || 'N/A',
        latitude: geoData.data.ll[0],
        longitude: geoData.data.ll[1],
      };
    }
  }
}

export default new GeolocalisationService();
