- Update mapping:
  ```json
  PUT: <es-domain>/exploreprofile/_mapping/doc
  {
    "properties": {
      "workplaceConnection": {
        "properties": {
          "geolocation": {
            "type": "geo_point"
          },
          "name": {
            "type": "text",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 256
              }
            },
            "analyzer": "lowercaseFilter"
          }
        }
      },
      "dutyRanges": {
        "type": "nested",
        "properties": {
            "end": {
                "type": "date"
            },
            "start": {
                "type": "date"
            }
        }
      },
      "profileConnection": {
        "properties": {
          "fullName": {
            "type": "text",
            "analyzer": "lowercaseFilter",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 256,
                "normalizer": "caseInsensitive"
              }
            }
          },
          "userName": {
            "type": "text",
            "analyzer": "lowercaseFilter",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 256,
                "normalizer": "caseInsensitive"
              }
            }
          }
        }
      }
    }
  }

  PUT: <es-domain>/user
  PUT: <es-domain>/profileconversation
  PUT: <es-domain>/venuefavorite
  PUT: <es-domain>/venuefavoritev2
  PUT: <es-domain>/following
  PUT: <es-domain>/profile
  PUT: <es-domain>/exploreprofile
  PUT: <es-domain>/followingreport
  {
    "settings": {
      "analysis": {
        "analyzer": {
          "lowercaseFilter": {
            "tokenizer": "whitespace",
            "filter" : ["lowercase"]
          }
        },
        "normalizer": {
          "caseInsensitive": {
            "filter": "lowercase"
          }
        }
      }
    }
  }

  PUT: <es-domain>/user/_mapping/doc
  {
    "properties": {
      "firstName": {
        "type": "text",
        "analyzer": "lowercaseFilter"
      },
      "lastName": {
        "type": "text",
        "analyzer": "lowercaseFilter"
      }
    }
  }

  PUT: <es-domain>/profileconversation/_mapping/doc
  {
    "properties": {
      "recipientConnection": {
          "properties": {
              "firstName": {
                  "type": "text",
                  "analyzer": "lowercaseFilter"
              },
              "lastName": {
                  "type": "text",
                  "analyzer": "lowercaseFilter"
              }
          }
      },
      "broadcastName": {
        "type": "text",
        "analyzer": "lowercaseFilter"
      }
    }
  }

  PUT: <es-domain>/venuefavorite/_mapping/doc
  {
    "properties": {
        "venue": {
            "properties": {
                "name": {
                    "type": "text",
                    "analyzer": "lowercaseFilter"
                }
            }
        }
    }
  }

  PUT: <es-domain>/venuefavoritev2/_mapping/doc
  {
    "properties": {
        "venue": {
            "properties": {
                "name": {
                    "type": "text",
                    "analyzer": "lowercaseFilter"
                }
            }
        }
    }
  }

  PUT: <es-domain>/following/_mapping/doc
  {
    "properties": {
      "staffProfileConnection": {
          "properties": {
              "firstName": {
                  "type": "text",
                  "analyzer": "lowercaseFilter"
              },
              "lastName": {
                  "type": "text",
                  "analyzer": "lowercaseFilter"
              }
          }
      },
      "patronProfileConnection": {
          "properties": {
              "firstName": {
                  "type": "text",
                  "analyzer": "lowercaseFilter"
              },
              "lastName": {
                  "type": "text",
                  "analyzer": "lowercaseFilter"
              }
          }
      }
  }
}

PUT: <es-domain>/followingreport/_mapping/doc
{
  "properties": {
      "staffProfileConnection": {
        "properties": {
          "firstName": {
            "type": "text",
            "analyzer": "lowercaseFilter"
          },
          "lastName": {
            "type": "text",
            "analyzer": "lowercaseFilter"
          },
          "userName": {
            "type": "text",
            "analyzer": "lowercaseFilter",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 256,
                "normalizer": "caseInsensitive"
              }
            }
          }
        }
      },
      "patronProfileConnection": {
        "properties": {
          "firstName": {
            "type": "text",
            "analyzer": "lowercaseFilter"
          },
          "lastName": {
            "type": "text",
            "analyzer": "lowercaseFilter"
          },
          "userName": {
            "type": "text",
            "analyzer": "lowercaseFilter",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 256,
                "normalizer": "caseInsensitive"
              }
            }
          }
        }
      }
  }
}

  PUT: <es-domain>/profile/_mapping/doc
  {
    "properties": {
      "userConnection": {
        "properties": {
          "userLocation": {
            "properties": {
              "geolocation": {
                "type": "geo_point"
              }
            }
          },
          "fullName": {
            "type": "text",
            "analyzer": "lowercaseFilter",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 256,
                "normalizer": "caseInsensitive"
              }
            }
          },
          "userName": {
            "type": "text",
            "analyzer": "lowercaseFilter",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 256,
                "normalizer": "caseInsensitive"
              }
            }
          }
        }
      }
    }
  }

  PUT: <es-domain>/post/_mapping/doc
  {
    "properties": {
      "caption": {
        "type": "text",
        "analyzer": "lowercaseFilter"
      }
    }
  }

  PUT: <es-domain>/venueleaderboard/_mapping/doc
  {
    "properties": {
      "venueConnection": {
        "properties": {
          "geolocation": {
            "type": "geo_point"
          }
        }
      }
    }
  }
  ```
