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
      // Allow both call("x", 1, 2) and call("x", [1,2]) styles
      const normalizedArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const response = await axios.post(`${this.baseUrl}/reducer/${this.database}/${reducer}`,
        { args: normalizedArgs }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to call reducer ${reducer}:`, error);
      throw error;
    }
  }

  async query(query: string, ...args: any[]): Promise<any> {
    try {
      // Allow both query("sql ...", a, b) and query("sql ...", [a,b]) styles
      const normalizedArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const response = await axios.post(`${this.baseUrl}/query/${this.database}/${query}`,
        { args: normalizedArgs }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to execute query ${query}:`, error);
      throw error;
    }
  }

  subscribe(table: string, callback: (data: any) => void): () => void {
    // Convert http(s)://host -> ws(s)://host for websockets
    const wsBase = this.baseUrl.replace(/^http(s?):\/\//, "ws$1://");
    const ws = new WebSocket(`${wsBase}/subscribe/${this.database}/${table}`);
    
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