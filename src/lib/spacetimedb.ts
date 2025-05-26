import axios from "axios";

export class SpacetimeDBClient {
  private baseUrl: string;
  private database: string;

  constructor(config: { host: string; database: string }) {
    this.baseUrl = `http://${config.host}`;
    this.database = config.database;
  }

  async call(reducer: string, ...args: any[]): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/reducer/${this.database}/${reducer}`, {
        args,
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to call reducer ${reducer}:`, error);
      throw error;
    }
  }

  async query(query: string, ...args: any[]): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/query/${this.database}/${query}`, {
        args,
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to execute query ${query}:`, error);
      throw error;
    }
  }

  subscribe(table: string, callback: (data: any) => void): () => void {
    const ws = new WebSocket(`ws://${this.baseUrl}/subscribe/${this.database}/${table}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    return () => {
      ws.close();
    };
  }
}

export const createSpacetimeDBClient = (config: { host: string; database: string }) => {
  return new SpacetimeDBClient(config);
}; 