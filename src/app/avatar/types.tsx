export interface TextInput {
  text: string;
}

export interface AudioInput {
  url: string;
}

export interface GenerateData {
  text?: TextInput;
  audio?: AudioInput;
}
