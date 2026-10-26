import { defineRailway, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const thainativeVolume = volume("thainative-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "asia-southeast1-eqsg3a", sizeMB: 50000 });
  const thainative = service("thainative", {
    build: { builder: "DOCKERFILE", dockerfilePath: "/Dockerfile" },
    healthcheck: "/health",
    healthcheckTimeout: 60,
    replicas: { "asia-southeast1-eqsg3a": 1 },
    domains: ["thainative.online"],
    volumeMounts: { "/data": thainativeVolume },
    env: { DATA_DIR: preserve(), HOST: preserve(), NODE_ENV: preserve(), PORT: preserve() },
  });

  return project("ThaiNative-Online", {
    resources: [thainative, thainativeVolume],
  });
});
