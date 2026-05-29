let chart = null;

// Initialiser les données Alpine
function initSongs() {
  return {
    songs: [],
    topArtists: [],
    searchQuery: '',
    get filteredSongs() {
      return this.songs.filter(s => 
        s.titre.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        s.artiste.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        s.album.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
  };
}

// Initialiser le graphique Chart.js
function initChart(topArtists) {
  const ctx = document.getElementById('chartArtistes')?.getContext('2d');
  
  if (!ctx) {
    console.error('Canvas chartArtistes non trouvé');
    return;
  }

  // Détruire le graphique précédent s'il existe
  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: topArtists.map(a => a.nom),
      datasets: [
        {
          label: 'Nombre de chansons',
          data: topArtists.map(a => a.count),
          backgroundColor: '#0d6efd',
          borderColor: '#0054cc',
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: {
            color: '#333',
          }
        }
      },
      scales: {
        y: {
          ticks: {
            color: '#666',
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          }
        },
        x: {
          ticks: {
            color: '#666',
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          }
        }
      }
    }
  });
}

// Charger les chansons depuis data.json
async function loadSongs() {
  try {
    const response = await fetch('./data/data.json');
    const albums = await response.json();

    // Extraire toutes les chansons de tous les albums
    const allSongs = [];
    
    albums.forEach(album => {
      if (album.album && album.album.tracks) {
        album.album.tracks.forEach(track => {
          allSongs.push({
            id: track.id,
            titre: track.name,
            artiste: album.album.artists[0]?.name || 'Artiste inconnu',
            album: album.album.name,
          });
        });
      }
    });

    // Compter les artistes
    const artisteCounts = {};
    allSongs.forEach(song => {
      artisteCounts[song.artiste] = (artisteCounts[song.artiste] || 0) + 1;
    });

    // Convertir en array et trier par count décroissant
    const topArtists = Object.entries(artisteCounts)
      .map(([nom, count]) => ({ nom, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Mettre à jour Alpine
    document.querySelector('[x-data*="initSongs"]')._x_dataStack[0].songs = allSongs;
    document.querySelector('[x-data*="initSongs"]')._x_dataStack[0].topArtists = topArtists;

    // Initialiser le graphique
    initChart(topArtists);
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
  }
}
