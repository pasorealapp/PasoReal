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
                video: "https://customer-cw0heb9gadqlxjsv.cloudflarestream.com/10ac873a161207846254bb189091b06f/manifest/video.m3u8",
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

              playa_el_tecolote: {
                id: "playa_el_tecolote",
                name: "Playa El Tecolote",
                video: "https://customer-cw0heb9gadqlxjsv.cloudflarestream.com/a5298d3a149723a4c28deebc582158d8/manifest/video.m3u8",
                geojson: {
                  type: "FeatureCollection",
                  features: [
                    {
                      type: "Feature",
                      geometry: {
                        type: "LineString",
                        coordinates: [
                          [
            -110.3172041,
            24.3364496
          ],
          [
            -110.3172041,
            24.3364496
          ],
          [
            -110.3172061,
            24.3364496
          ],
          [
            -110.317634,
            24.3364287
          ],
          [
            -110.3182832,
            24.33634
          ],
          [
            -110.3185146,
            24.3363198
          ],
          [
            -110.3193967,
            24.3362747
          ],
          [
            -110.3197463,
            24.3362573
          ],
          [
            -110.3244408,
            24.3357579
          ]
                        ]
                      },
                      properties: {}
                    }
                  ]
                },
                achievement: {
                  title: "Explorador del Tecolote",
                  description: "Recorrido completado en la Playa de La Paz"
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
