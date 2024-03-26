import React, { useState, useEffect, useRef } from "react";
import { PeerConnectionClient } from "./pc";

class AzureClient extends PeerConnectionClient {
  private socket: WebSocket;
  constructor(video: HTMLVideoElement) {
    super(video, "azure");
    this.socket = new WebSocket(
      "wss://westus2.voice.speech.microsoft.com/cognitiveservices/websocket/v1?enableTalkingAvatar=true&Ocp-Apim-Subscription-Key=3f3ee45ab52a452ca027ccd59d34b0da&X-ConnectionId=30F8A079847A4DE4AB7A15A6B17E9DAD",
    );
    this.socket.onopen = () => {
      console.log("Azure socket opened");
      this.sendConfig();
      console.log("Azure socket config sent");
      this.sendContext();
      console.log("Azure socket context sent");
      this.sendSsml("Hello World!");
      console.log("Azure socket ssml sent");
    };
    this.socket.onclose = () => {
      console.log("Azure socket closed");
    };
    this.socket.onerror = (error) => {
      console.error("Azure socket error:", error);
    };
    this.socket.onmessage = (event) => {
      console.log("Azure socket message:", event.data);
    };
  }
  async sendConfig() {
    /*const msg = {
      "context":{
        "system":{
          "name":"SpeechSDK","version":"1.36.0","build":"JavaScript","lang":"JavaScript"
        },"os":{
          "platform":"Browser/MacIntel","name":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36","version":"5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        },"synthesis":{
          "video":{
            "format":{
              "bitrate":2000000,
              "codec":"H264",
              "crop":{"bottomRight":{"x":1920,"y":1080},"topLeft":{"x":0,"y":0}},
              "resolution":{"height":1080,"width":1920}},
              "protocol":{
                "name":"WebRTC",
                "webrtcConfig":{
                  "clientDescription":"eyJ0eXBlIjoib2ZmZXIiLCJzZHAiOiJ2PTBcclxubz0tIDkwNjIzNTc5OTc0MzczNjE2MSAyIElOIElQNCAxMjcuMC4wLjFcclxucz0tXHJcbnQ9MCAwXHJcbmE9Z3JvdXA6QlVORExFIDAgMVxyXG5hPWV4dG1hcC1hbGxvdy1taXhlZFxyXG5hPW1zaWQtc2VtYW50aWM6IFdNU1xyXG5tPXZpZGVvIDQ2MzA3IFVEUC9UTFMvUlRQL1NBVlBGIDk2IDk3IDEwMiAxMDMgMTA0IDEwNSAxMDYgMTA3IDEwOCAxMDkgMTI3IDEyNSAzOSA0MCA0NSA0NiA5OCA5OSAxMDAgMTAxIDExMiAxMTMgMTE2IDExNyAxMThcclxuYz1JTiBJUDQgNTAuMjAyLjE5My4xOTVcclxuYT1ydGNwOjkgSU4gSVA0IDAuMC4wLjBcclxuYT1jYW5kaWRhdGU6MzU0NTQzNTE0MCAxIHVkcCAyMTEzOTM3MTUxIDhkMTM2NWIzLWI1ZTUtNDRjYy04MTQwLTA4MTJjNGIxM2I1OC5sb2NhbCA2NTIyNCB0eXAgaG9zdCBnZW5lcmF0aW9uIDAgbmV0d29yay1jb3N0IDk5OVxyXG5hPWNhbmRpZGF0ZTo0MDU1MDMzNzQ1IDEgdWRwIDE2Nzc3Mjk1MzUgNTAuMjAyLjE5My4xOTUgNDYzMDcgdHlwIHNyZmx4IHJhZGRyIDAuMC4wLjAgcnBvcnQgMCBnZW5lcmF0aW9uIDAgbmV0d29yay1jb3N0IDk5OVxyXG5hPWljZS11ZnJhZzpRZDZIXHJcbmE9aWNlLXB3ZDpycllJVUl3Q0ZtOTVIVkpJSThyVTVpSTFcclxuYT1pY2Utb3B0aW9uczp0cmlja2xlXHJcbmE9ZmluZ2VycHJpbnQ6c2hhLTI1NiBFNTozMjowRDo5QTpDQTpFQTpEMjowMDpCRjpBMDo4RDo2QzpBNzo3NTpDMjo2MjpBMjo0Njo0NDpCMDo5RTpBNTowNzoyRDo3Njo2RTo3NzowOTpDNTo2OTo5QTpCNVxyXG5hPXNldHVwOmFjdHBhc3NcclxuYT1taWQ6MFxyXG5hPWV4dG1hcDoxIHVybjppZXRmOnBhcmFtczpydHAtaGRyZXh0OnRvZmZzZXRcclxuYT1leHRtYXA6MiBodHRwOi8vd3d3LndlYnJ0Yy5vcmcvZXhwZXJpbWVudHMvcnRwLWhkcmV4dC9hYnMtc2VuZC10aW1lXHJcbmE9ZXh0bWFwOjMgdXJuOjNncHA6dmlkZW8tb3JpZW50YXRpb25cclxuYT1leHRtYXA6NCBodHRwOi8vd3d3LmlldGYub3JnL2lkL2RyYWZ0LWhvbG1lci1ybWNhdC10cmFuc3BvcnQtd2lkZS1jYy1leHRlbnNpb25zLTAxXHJcbmE9ZXh0bWFwOjUgaHR0cDovL3d3dy53ZWJydGMub3JnL2V4cGVyaW1lbnRzL3J0cC1oZHJleHQvcGxheW91dC1kZWxheVxyXG5hPWV4dG1hcDo2IGh0dHA6Ly93d3cud2VicnRjLm9yZy9leHBlcmltZW50cy9ydHAtaGRyZXh0L3ZpZGVvLWNvbnRlbnQtdHlwZVxyXG5hPWV4dG1hcDo3IGh0dHA6Ly93d3cud2VicnRjLm9yZy9leHBlcmltZW50cy9ydHAtaGRyZXh0L3ZpZGVvLXRpbWluZ1xyXG5hPWV4dG1hcDo4IGh0dHA6Ly93d3cud2VicnRjLm9yZy9leHBlcmltZW50cy9ydHAtaGRyZXh0L2NvbG9yLXNwYWNlXHJcbmE9ZXh0bWFwOjkgdXJuOmlldGY6cGFyYW1zOnJ0cC1oZHJleHQ6c2RlczptaWRcclxuYT1leHRtYXA6MTAgdXJuOmlldGY6cGFyYW1zOnJ0cC1oZHJleHQ6c2RlczpydHAtc3RyZWFtLWlkXHJcbmE9ZXh0bWFwOjExIHVybjppZXRmOnBhcmFtczpydHAtaGRyZXh0OnNkZXM6cmVwYWlyZWQtcnRwLXN0cmVhbS1pZFxyXG5hPXNlbmRyZWN2XHJcbmE9bXNpZDotIGUwNzFjOTVhLWVkM2MtNDU0ZC1iNmE1LWYxNDI4YzUzNTczNVxyXG5hPXJ0Y3AtbXV4XHJcbmE9cnRjcC1yc2l6ZVxyXG5hPXJ0cG1hcDo5NiBWUDgvOTAwMDBcclxuYT1ydGNwLWZiOjk2IGdvb2ctcmVtYlxyXG5hPXJ0Y3AtZmI6OTYgdHJhbnNwb3J0LWNjXHJcbmE9cnRjcC1mYjo5NiBjY20gZmlyXHJcbmE9cnRjcC1mYjo5NiBuYWNrXHJcbmE9cnRjcC1mYjo5NiBuYWNrIHBsaVxyXG5hPXJ0cG1hcDo5NyBydHgvOTAwMDBcclxuYT1mbXRwOjk3IGFwdD05NlxyXG5hPXJ0cG1hcDoxMDIgSDI2NC85MDAwMFxyXG5hPXJ0Y3AtZmI6MTAyIGdvb2ctcmVtYlxyXG5hPXJ0Y3AtZmI6MTAyIHRyYW5zcG9ydC1jY1xyXG5hPXJ0Y3AtZmI6MTAyIGNjbSBmaXJcclxuYT1ydGNwLWZiOjEwMiBuYWNrXHJcbmE9cnRjcC1mYjoxMDIgbmFjayBwbGlcclxuYT1mbXRwOjEwMiBsZXZlbC1hc3ltbWV0cnktYWxsb3dlZD0xO3BhY2tldGl6YXRpb24tbW9kZT0xO3Byb2ZpbGUtbGV2ZWwtaWQ9NDIwMDFmXHJcbmE9cnRwbWFwOjEwMyBydHgvOTAwMDBcclxuYT1mbXRwOjEwMyBhcHQ9MTAyXHJcbmE9cnRwbWFwOjEwNCBIMjY0LzkwMDAwXHJcbmE9cnRjcC1mYjoxMDQgZ29vZy1yZW1iXHJcbmE9cnRjcC1mYjoxMDQgdHJhbnNwb3J0LWNjXHJcbmE9cnRjcC1mYjoxMDQgY2NtIGZpclxyXG5hPXJ0Y3AtZmI6MTA0IG5hY2tcclxuYT1ydGNwLWZiOjEwNCBuYWNrIHBsaVxyXG5hPWZtdHA6MTA0IGxldmVsLWFzeW1tZXRyeS1hbGxvd2VkPTE7cGFja2V0aXphdGlvbi1tb2RlPTA7cHJvZmlsZS1sZXZlbC1pZD00MjAwMWZcclxuYT1ydHBtYXA6MTA1IHJ0eC85MDAwMFxyXG5hPWZtdHA6MTA1IGFwdD0xMDRcclxuYT1ydHBtYXA6MTA2IEgyNjQvOTAwMDBcclxuYT1ydGNwLWZiOjEwNiBnb29nLXJlbWJcclxuYT1ydGNwLWZiOjEwNiB0cmFuc3BvcnQtY2NcclxuYT1ydGNwLWZiOjEwNiBjY20gZmlyXHJcbmE9cnRjcC1mYjoxMDYgbmFja1xyXG5hPXJ0Y3AtZmI6MTA2IG5hY2sgcGxpXHJcbmE9Zm10cDoxMDYgbGV2ZWwtYXN5bW1ldHJ5LWFsbG93ZWQ9MTtwYWNrZXRpemF0aW9uLW1vZGU9MTtwcm9maWxlLWxldmVsLWlkPTQyZTAxZlxyXG5hPXJ0cG1hcDoxMDcgcnR4LzkwMDAwXHJcbmE9Zm10cDoxMDcgYXB0PTEwNlxyXG5hPXJ0cG1hcDoxMDggSDI2NC85MDAwMFxyXG5hPXJ0Y3AtZmI6MTA4IGdvb2ctcmVtYlxyXG5hPXJ0Y3AtZmI6MTA4IHRyYW5zcG9ydC1jY1xyXG5hPXJ0Y3AtZmI6MTA4IGNjbSBmaXJcclxuYT1ydGNwLWZiOjEwOCBuYWNrXHJcbmE9cnRjcC1mYjoxMDggbmFjayBwbGlcclxuYT1mbXRwOjEwOCBsZXZlbC1hc3ltbWV0cnktYWxsb3dlZD0xO3BhY2tldGl6YXRpb24tbW9kZT0wO3Byb2ZpbGUtbGV2ZWwtaWQ9NDJlMDFmXHJcbmE9cnRwbWFwOjEwOSBydHgvOTAwMDBcclxuYT1mbXRwOjEwOSBhcHQ9MTA4XHJcbmE9cnRwbWFwOjEyNyBIMjY0LzkwMDAwXHJcbmE9cnRjcC1mYjoxMjcgZ29vZy1yZW1iXHJcbmE9cnRjcC1mYjoxMjcgdHJhbnNwb3J0LWNjXHJcbmE9cnRjcC1mYjoxMjcgY2NtIGZpclxyXG5hPXJ0Y3AtZmI6MTI3IG5hY2tcclxuYT1ydGNwLWZiOjEyNyBuYWNrIHBsaVxyXG5hPWZtdHA6MTI3IGxldmVsLWFzeW1tZXRyeS1hbGxvd2VkPTE7cGFja2V0aXphdGlvbi1tb2RlPTE7cHJvZmlsZS1sZXZlbC1pZD00ZDAwMWZcclxuYT1ydHBtYXA6MTI1IHJ0eC85MDAwMFxyXG5hPWZtdHA6MTI1IGFwdD0xMjdcclxuYT1ydHBtYXA6MzkgSDI2NC85MDAwMFxyXG5hPXJ0Y3AtZmI6MzkgZ29vZy1yZW1iXHJcbmE9cnRjcC1mYjozOSB0cmFuc3BvcnQtY2NcclxuYT1ydGNwLWZiOjM5IGNjbSBmaXJcclxuYT1ydGNwLWZiOjM5IG5hY2tcclxuYT1ydGNwLWZiOjM5IG5hY2sgcGxpXHJcbmE9Zm10cDozOSBsZXZlbC1hc3ltbWV0cnktYWxsb3dlZD0xO3BhY2tldGl6YXRpb24tbW9kZT0wO3Byb2ZpbGUtbGV2ZWwtaWQ9NGQwMDFmXHJcbmE9cnRwbWFwOjQwIHJ0eC85MDAwMFxyXG5hPWZtdHA6NDAgYXB0PTM5XHJcbmE9cnRwbWFwOjQ1IEFWMS85MDAwMFxyXG5hPXJ0Y3AtZmI6NDUgZ29vZy1yZW1iXHJcbmE9cnRjcC1mYjo0NSB0cmFuc3BvcnQtY2NcclxuYT1ydGNwLWZiOjQ1IGNjbSBmaXJcclxuYT1ydGNwLWZiOjQ1IG5hY2tcclxuYT1ydGNwLWZiOjQ1IG5hY2sgcGxpXHJcbmE9cnRwbWFwOjQ2IHJ0eC85MDAwMFxyXG5hPWZtdHA6NDYgYXB0PTQ1XHJcbmE9cnRwbWFwOjk4IFZQOS85MDAwMFxyXG5hPXJ0Y3AtZmI6OTggZ29vZy1yZW1iXHJcbmE9cnRjcC1mYjo5OCB0cmFuc3BvcnQtY2NcclxuYT1ydGNwLWZiOjk4IGNjbSBmaXJcclxuYT1ydGNwLWZiOjk4IG5hY2tcclxuYT1ydGNwLWZiOjk4IG5hY2sgcGxpXHJcbmE9Zm10cDo5OCBwcm9maWxlLWlkPTBcclxuYT1ydHBtYXA6OTkgcnR4LzkwMDAwXHJcbmE9Zm10cDo5OSBhcHQ9OThcclxuYT1ydHBtYXA6MTAwIFZQOS85MDAwMFxyXG5hPXJ0Y3AtZmI6MTAwIGdvb2ctcmVtYlxyXG5hPXJ0Y3AtZmI6MTAwIHRyYW5zcG9ydC1jY1xyXG5hPXJ0Y3AtZmI6MTAwIGNjbSBmaXJcclxuYT1ydGNwLWZiOjEwMCBuYWNrXHJcbmE9cnRjcC1mYjoxMDAgbmFjayBwbGlcclxuYT1mbXRwOjEwMCBwcm9maWxlLWlkPTJcclxuYT1ydHBtYXA6MTAxIHJ0eC85MDAwMFxyXG5hPWZtdHA6MTAxIGFwdD0xMDBcclxuYT1ydHBtYXA6MTEyIEgyNjQvOTAwMDBcclxuYT1ydGNwLWZiOjExMiBnb29nLXJlbWJcclxuYT1ydGNwLWZiOjExMiB0cmFuc3BvcnQtY2NcclxuYT1ydGNwLWZiOjExMiBjY20gZmlyXHJcbmE9cnRjcC1mYjoxMTIgbmFja1xyXG5hPXJ0Y3AtZmI6MTEyIG5hY2sgcGxpXHJcbmE9Zm10cDoxMTIgbGV2ZWwtYXN5bW1ldHJ5LWFsbG93ZWQ9MTtwYWNrZXRpemF0aW9uLW1vZGU9MTtwcm9maWxlLWxldmVsLWlkPTY0MDAxZlxyXG5hPXJ0cG1hcDoxMTMgcnR4LzkwMDAwXHJcbmE9Zm10cDoxMTMgYXB0PTExMlxyXG5hPXJ0cG1hcDoxMTYgcmVkLzkwMDAwXHJcbmE9cnRwbWFwOjExNyBydHgvOTAwMDBcclxuYT1mbXRwOjExNyBhcHQ9MTE2XHJcbmE9cnRwbWFwOjExOCB1bHBmZWMvOTAwMDBcclxuYT1zc3JjLWdyb3VwOkZJRCAyMDg4OTgwNjc5IDMyMDkxMzA4MzNcclxuYT1zc3JjOjIwODg5ODA2NzkgY25hbWU6N04vYjJ4TGg4WDJQSjBmOVxyXG5hPXNzcmM6MjA4ODk4MDY3OSBtc2lkOi0gZTA3MWM5NWEtZWQzYy00NTRkLWI2YTUtZjE0MjhjNTM1NzM1XHJcbmE9c3NyYzozMjA5MTMwODMzIGNuYW1lOjdOL2IyeExoOFgyUEowZjlcclxuYT1zc3JjOjMyMDkxMzA4MzMgbXNpZDotIGUwNzFjOTVhLWVkM2MtNDU0ZC1iNmE1LWYxNDI4YzUzNTczNVxyXG5tPWF1ZGlvIDQ2MzA4IFVEUC9UTFMvUlRQL1NBVlBGIDExMSA2MyA5IDAgOCAxMyAxMTAgMTI2XHJcbmM9SU4gSVA0IDUwLjIwMi4xOTMuMTk1XHJcbmE9cnRjcDo5IElOIElQNCAwLjAuMC4wXHJcbmE9Y2FuZGlkYXRlOjM1NDU0MzUxNDAgMSB1ZHAgMjExMzkzNzE1MSA4ZDEzNjViMy1iNWU1LTQ0Y2MtODE0MC0wODEyYzRiMTNiNTgubG9jYWwgNTMxMDEgdHlwIGhvc3QgZ2VuZXJhdGlvbiAwIG5ldHdvcmstY29zdCA5OTlcclxuYT1jYW5kaWRhdGU6NDA1NTAzMzc0NSAxIHVkcCAxNjc3NzI5NTM1IDUwLjIwMi4xOTMuMTk1IDQ2MzA4IHR5cCBzcmZseCByYWRkciAwLjAuMC4wIHJwb3J0IDAgZ2VuZXJhdGlvbiAwIG5ldHdvcmstY29zdCA5OTlcclxuYT1pY2UtdWZyYWc6UWQ2SFxyXG5hPWljZS1wd2Q6cnJZSVVJd0NGbTk1SFZKSUk4clU1aUkxXHJcbmE9aWNlLW9wdGlvbnM6dHJpY2tsZVxyXG5hPWZpbmdlcnByaW50OnNoYS0yNTYgRTU6MzI6MEQ6OUE6Q0E6RUE6RDI6MDA6QkY6QTA6OEQ6NkM6QTc6NzU6QzI6NjI6QTI6NDY6NDQ6QjA6OUU6QTU6MDc6MkQ6NzY6NkU6Nzc6MDk6QzU6Njk6OUE6QjVcclxuYT1zZXR1cDphY3RwYXNzXHJcbmE9bWlkOjFcclxuYT1leHRtYXA6MTQgdXJuOmlldGY6cGFyYW1zOnJ0cC1oZHJleHQ6c3NyYy1hdWRpby1sZXZlbFxyXG5hPWV4dG1hcDoyIGh0dHA6Ly93d3cud2VicnRjLm9yZy9leHBlcmltZW50cy9ydHAtaGRyZXh0L2Ficy1zZW5kLXRpbWVcclxuYT1leHRtYXA6NCBodHRwOi8vd3d3LmlldGYub3JnL2lkL2RyYWZ0LWhvbG1lci1ybWNhdC10cmFuc3BvcnQtd2lkZS1jYy1leHRlbnNpb25zLTAxXHJcbmE9ZXh0bWFwOjkgdXJuOmlldGY6cGFyYW1zOnJ0cC1oZHJleHQ6c2RlczptaWRcclxuYT1zZW5kcmVjdlxyXG5hPW1zaWQ6LSA2OTdiNWI5MC1jNGNmLTRmNjItYTFhYi1lYmZhNjBjYWY5NGJcclxuYT1ydGNwLW11eFxyXG5hPXJ0cG1hcDoxMTEgb3B1cy80ODAwMC8yXHJcbmE9cnRjcC1mYjoxMTEgdHJhbnNwb3J0LWNjXHJcbmE9Zm10cDoxMTEgbWlucHRpbWU9MTA7dXNlaW5iYW5kZmVjPTFcclxuYT1ydHBtYXA6NjMgcmVkLzQ4MDAwLzJcclxuYT1mbXRwOjYzIDExMS8xMTFcclxuYT1ydHBtYXA6OSBHNzIyLzgwMDBcclxuYT1ydHBtYXA6MCBQQ01VLzgwMDBcclxuYT1ydHBtYXA6OCBQQ01BLzgwMDBcclxuYT1ydHBtYXA6MTMgQ04vODAwMFxyXG5hPXJ0cG1hcDoxMTAgdGVsZXBob25lLWV2ZW50LzQ4MDAwXHJcbmE9cnRwbWFwOjEyNiB0ZWxlcGhvbmUtZXZlbnQvODAwMFxyXG5hPXNzcmM6MTgwMjA0NjI3NiBjbmFtZTo3Ti9iMnhMaDhYMlBKMGY5XHJcbmE9c3NyYzoxODAyMDQ2Mjc2IG1zaWQ6LSA2OTdiNWI5MC1jNGNmLTRmNjItYTFhYi1lYmZhNjBjYWY5NGJcclxuIn0=",
                  "iceServers":[{"credential":"def","urls":["turn:relay.communication.microsoft.com:3478"],"username":"abc"}]}},
                  "talkingAvatar":{
                    "background":{"color":"#FFFFFFFF"},
                    "character":"lisa",
                    "customized":false,
                    "style":"casual-sitting"
                  }              
              }
            }
          }
        };*/
    const msg =
      "Path: speech.config\r\nX-RequestId: F320D23CAFF7487F9CBD26222A6D5651\r\nX-Timestamp: 2024-03-25T04:33:00.554Z\r\nContent-Type: application/json\r\n\r\n" +
      `{"context":{"system":{"name":"SpeechSDK","version":"1.36.0","build":"JavaScript","lang":"JavaScript"},"os":{"platform":"Browser/MacIntel","name":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36","version":"5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"},"synthesis":{"video":{"format":{"bitrate":2000000,"codec":"H264","crop":{"bottomRight":{"x":1920,"y":1080},"topLeft":{"x":0,"y":0}},"resolution":{"height":1080,"width":1920}},"protocol":{"name":"WebRTC","webrtcConfig":{"clientDescription":"","iceServers":[{"credential":"def","urls":["turn:relay.communication.microsoft.com:3478"],"username":"abc"}]}},"talkingAvatar":{"background":{"color":"#FFFFFFFF"},"character":"lisa","customized":false,"style":"casual-sitting"}}}}}`;
    this.socket.send(msg);
  }

  async sendContext() {
    /*const msg = {
      "synthesis":{
        "audio":{
          "metadataOptions":{
            "bookmarkEnabled":false,"sessionEndEnabled":true,"visemeEnabled":false
          },
          "outputFormat":"raw-24khz-16bit-mono-pcm"
        },
        "language":{}
      }*/
    const msg =
      "Path: synthesis.context\r\nX-RequestId: F320D23CAFF7487F9CBD26222A6D5651\r\nX-Timestamp: 2024-03-25T04:33:00.555Z\r\nContent-Type: application/json\r\n\r\n" +
      `{"synthesis":{"audio":{"metadataOptions":{"bookmarkEnabled":false,"sessionEndEnabled":true,"visemeEnabled":false},"outputFormat":"raw-24khz-16bit-mono-pcm"},"language":{}}}`;
    this.socket.send(msg);
  }

  async sendSsml(text: string) {
    const msg =
      "Path: ssml\r\nX-RequestId: F320D23CAFF7487F9CBD26222A6D5651\r\nX-Timestamp: 2024-03-25T04:33:00.555Z\r\nContent-Type: application/ssml+xml\r\n\r\n" +
      `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts' xmlns:emo='http://www.w3.org/2009/10/emotionml' xml:lang='en-US'><voice name='en-US-JennyMultilingualV2Neural'>${text}</voice></speak>`;
    this.socket.send(msg);
  }
}

export function AzurePage({ text }: { text: string }) {
  const clientRef = useRef<AzureClient | null>(null);
  const mediaElementRef = useRef<HTMLVideoElement>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Cleanup peer connection on component unmount
    return () => {
      clientRef.current?.close();
    };
  }, []);

  const connect = async () => {
    clientRef.current = new AzureClient(mediaElementRef.current!);
    clientRef.current.addEventListener(
      "connected",
      (evt: CustomEventInit<boolean>) => setConnected(!!evt.detail),
    );
    await clientRef.current.connect();
  };
  const generate = async () => clientRef.current?.generate({ text });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2">
        <button
          onClick={connect}
          className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon"
        >
          Connect
        </button>
        <button
          onClick={generate}
          className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon"
        >
          Speak
        </button>
      </div>
      <div className="mt-6 w-[400px] h-[400px]">
        {connected && (
          <div>Connection ready, press speak to render the avatar. </div>
        )}
        <video ref={mediaElementRef} id="mediaElement" />
      </div>
    </div>
  );
}
