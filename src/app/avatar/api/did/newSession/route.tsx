import { doPost } from "../helper";
interface PresenterInput {
  [service: string]: {
    source_url?: string;
    presenter_id?: string;
    driver_id?: string;
  };
}

const presenterInputByService: PresenterInput = {
  talks: {
    source_url: 'https://d-id-public-bucket.s3.amazonaws.com/or-roman.jpg',
  },
  clips: {
    presenter_id: 'rian-lZC6MmWfC1',
    driver_id: 'mXra4jY38i',
  },
};
export async function POST(req: Request): Promise<Response> {  
  const service = process.env.DID_SERVICE || '';
  return doPost('/streams', presenterInputByService[service]);
}
