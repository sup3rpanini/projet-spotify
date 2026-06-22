let chartArtistes = null;
let chartGenres = null;

// Initialiser les données Alpine
function initSongs() {
  return {
    songs: [],
    topArtists: [],
    searchQuery: '',
    selectedSong: null,
    get filteredSongs() {
      return this.songs.filter(s =>
        s.titre.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        s.artiste.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        s.album.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    },
    formatDuration(ms) {
      const total = Math.floor(ms / 1000);
      const min = Math.floor(total / 60);
      const sec = String(total % 60).padStart(2, '0');
      return `${min}:${sec}`;
    },
    formatDate(dateStr) {
      if (!dateStr) return '';
      const [y, m, d] = dateStr.split('-');
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    },
    openDetails(song) {
      this.selectedSong = song;
      const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
      modal.show();
      
      // Créer et charger l'audio après que le modal soit affiché
      setTimeout(() => {
        const container = document.getElementById('audioContainer');
        if (container && song.preview_url) {
          container.innerHTML = '';
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.style.width = '100%';
          audio.style.cursor = 'pointer';
          
          const source = document.createElement('source');
          source.src = song.preview_url;
          source.type = 'audio/mpeg';
          
          audio.appendChild(source);
          
          const errorMsg = document.createElement('div');
          errorMsg.style.marginTop = '10px';
          errorMsg.style.padding = '10px';
          errorMsg.style.backgroundColor = '#fff3cd';
          errorMsg.style.color = '#856404';
          errorMsg.style.borderRadius = '4px';
          errorMsg.style.display = 'none';
          errorMsg.innerHTML = '⚠️ Cet aperçu n\'est pas disponible. Écoute sur Spotify ou Deezer pour entendre la chanson complète.';
          
          audio.addEventListener('canplay', () => {
            console.log('Audio prêt à être joué');
            errorMsg.style.display = 'none';
          });
          
          audio.addEventListener('error', (e) => {
            console.error('Erreur audio:', audio.error, e);
            audio.style.display = 'none';
            errorMsg.style.display = 'block';
          });
          
          // Afficher l'erreur après 3 secondes si l'audio ne charge pas
          const timeout = setTimeout(() => {
            if (audio.readyState === 0) {
              audio.style.display = 'none';
              errorMsg.style.display = 'block';
            }
          }, 3000);
          
          audio.addEventListener('canplay', () => {
            clearTimeout(timeout);
          });
          
          container.appendChild(audio);
          container.appendChild(errorMsg);
        }
      }, 200);
    }
  };
}

// Initialiser le graphique des artistes (Bar Chart)
function initChart(topArtists) {
  const ctx = document.getElementById('chartArtistes')?.getContext('2d');
  
  if (!ctx) {
    console.error('Canvas chartArtistes non trouvé');
    return;
  }
  
  // Détruire le graphique précédent s'il existe
  if (chartArtistes) {
    chartArtistes.destroy();
  }
  
  chartArtistes = new Chart(ctx, {
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
      indexAxis: 'y',
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

// Initialiser le graphique des genres (Pie Chart)
function initGenreChart(genreData) {
  const ctx = document.getElementById('chartGenres')?.getContext('2d');
  
  if (!ctx) {
    console.error('Canvas chartGenres non trouvé');
    return;
  }

  // Détruire le graphique précédent s'il existe
  if (chartGenres) {
    chartGenres.destroy();
  }

  const colors = [
    '#0d6efd', '#6f42c1', '#e83e8c', '#fd7e14', '#ffc107', '#20c997', '#17a2b8'
  ];

  chartGenres = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: genreData.map(g => g.nom),
      datasets: [
        {
          data: genreData.map(g => g.count),
          backgroundColor: colors.slice(0, genreData.length),
          borderColor: '#fff',
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#333',
            padding: 15,
            font: { size: 12 }
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
    const tracks = await response.json();

    // Traiter directement les chansons du JSON
    const allSongs = tracks.map(track => ({
      id: track.id,
      titre: track.name,
      artiste: track.artists[0]?.name || 'Artiste inconnu',
      album: track.album.name,
      image: track.album.images[1]?.url || track.album.images[0]?.url || '',
      preview_url: track.preview_url || '',
      genres: track.album.genres || [],
      duration_ms: track.duration_ms || 0,
      popularity: track.popularity || 0,
      explicit: track.explicit || false,
      track_number: track.track_number || 1,
      release_date: track.album.release_date || '',
      total_tracks: track.album.total_tracks || 0,
      artists: track.artists.map(a => ({
        name: a.name,
        popularity: a.popularity || 0,
        followers: a.followers?.total || 0,
        image: a.images?.[1]?.url || a.images?.[0]?.url || ''
      }))
    }));

    // Compter les artistes
    const artisteCounts = {};
    allSongs.forEach(song => {
      artisteCounts[song.artiste] = (artisteCounts[song.artiste] || 0) + 1;
    });

    // Convertir en array et trier par ordre décroissant
    const topArtists = Object.entries(artisteCounts)
      .map(([nom, count]) => ({ nom, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Compter les genres
    const genreCounts = {};
    allSongs.forEach(song => {
      song.genres.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });

    // Convertir en array et grouper les genres avec - de 3 musiques dans "Autres"
    let topGenres = Object.entries(genreCounts)
      .map(([nom, count]) => ({ nom, count }))
      .sort((a, b) => b.count - a.count);

    const topGenresFiltered = topGenres.filter(g => g.count >= 3);
    const otherCount = topGenres.filter(g => g.count < 3).reduce((sum, g) => sum + g.count, 0);

    if (otherCount > 0) {
      topGenresFiltered.push({ nom: 'Autres', count: otherCount });
    }

    // Mettre à jour Alpine
    document.querySelector('[x-data*="initSongs"]')._x_dataStack[0].songs = allSongs;
    document.querySelector('[x-data*="initSongs"]')._x_dataStack[0].topArtists = topArtists;

    // Initialiser les graphiques
    initChart(topArtists);
    initGenreChart(topGenresFiltered);
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
  }
}
