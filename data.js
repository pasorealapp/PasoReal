// js/data.js
window.APP_DATA = {
  mexico: {
    name: "México",
    states: {
      baja_california_sur: {
        name: "Baja California Sur",
        cities: {
          la_paz: {
            name: "La Paz",
            routes: {
              malecon_lapaz: {
                id: "malecon_lapaz",
                name: "Malecón de La Paz",
                video: "https://customer-cw0heb9gadqlxjsv.cloudflarestream.com/8aa913ae75d3814cce9a27bd280d2c4a/manifest/video.m3u8",
                geojson: {
                  type: "FeatureCollection",
                  features: [
                    {
                      type: "Feature",
                      geometry: {
                        type: "LineString",
                        coordinates: [
                          [-110.3220602384242, 24.155825393525348],
                          [-110.32138172975775, 24.156255814953923],
                          [-110.32136508373938, 24.15635321778008],
                          [-110.3198730819691, 24.157896876504864],
                          [-110.31873473493896, 24.160532523268202]
                        ]
                      },
                      properties: {}
                    }
                  ]
                },
                achievement: {
                  title: "Explorador del Malecón",
                  description: "Primera caminata completada en La Paz"
                }
              },

              centro_historico: {
                id: "centro_historico",
                name: "Centro Histórico",
                video: "assets/videos/centro_historico.mp4",
                geojson: {
                  type: "FeatureCollection",
                  features: [
                    {
                      type: "Feature",
                      geometry: {
                        type: "LineString",
                        coordinates: [
                          [-110.3169, 24.1625],
                          [-110.3160, 24.1610],
                          [-110.3150, 24.1595]
                        ]
                      },
                      properties: {}
                    }
                  ]
                },
                achievement: {
                  title: "Explorador del Centro Histórico",
                  description: "Recorrido completado en el centro de La Paz"
                }
              }
            }
          }
        }
      },

      baja_california: {
        name: "Baja California",
        cities: {
          tijuana: {
            name: "Tijuana",
            routes: {
              av_revolucion: {
                id: "av_revolucion",
                name: "Av. Revolución",
                video: "assets/videos/tijuana_av_revolucion.mp4",
                geojson: {
                  type: "FeatureCollection",
                  features: [
                    {
                      type: "Feature",
                      geometry: {
                        type: "LineString",
                        coordinates: [
                          [-117.0382, 32.5337],
                          [-117.0375, 32.5332],
                          [-117.0367, 32.5326]
                        ]
                      },
                      properties: {}
                    }
                  ]
                },
                achievement: {
                  title: "Explorador de la Revolución",
                  description: "Caminata completada en Av. Revolución"
                }
              }
            }
          }
        }
      }
    }
  }
};
