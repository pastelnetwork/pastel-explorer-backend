import axios from 'axios';

class GeolocalisationService {
  private getUrl(ip: string): string {
    return `https://www.iplocate.io/api/lookup/${ip}`;
  }
  async getGeoData(ip: string): Promise<GeoData> {
    const { data: geoData } = await axios.get<GeoApiData>(this.getUrl(ip));
    return {
      city: geoData.city || 'N/A',
      country: geoData.country || 'N/A',
      latitude: geoData.latitude,
      longitude: geoData.longitude,
    };
  }
}

export default new GeolocalisationService();
