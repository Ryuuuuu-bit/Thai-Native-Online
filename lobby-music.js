'use strict';
const lobbyMusic = document.getElementById('lobby-music');
const musicToggle = document.getElementById('music-toggle');
lobbyMusic.volume = 0.3;
function showMusicState() {
  const playing = !lobbyMusic.paused;
  musicToggle.setAttribute('aria-pressed', String(playing));
  musicToggle.setAttribute('aria-label', playing ? 'ปิดเพลงหมู่บ้าน' : 'เปิดเพลงหมู่บ้าน');
  musicToggle.textContent = playing ? '♫ เปิดอยู่' : '♫ เพลง';
}
musicToggle.addEventListener('click', async () => {
  if (!lobbyMusic.paused) {
    lobbyMusic.pause();
    return;
  }
  musicToggle.disabled = true;
  try {
    await lobbyMusic.play();
  } catch {
    musicToggle.textContent = '♫ ลองอีกครั้ง';
    musicToggle.setAttribute('aria-label', 'เปิดเพลงไม่สำเร็จ กดเพื่อลองอีกครั้ง');
  } finally {
    musicToggle.disabled = false;
  }
});
lobbyMusic.addEventListener('play', showMusicState);
lobbyMusic.addEventListener('pause', showMusicState);
lobbyMusic.addEventListener('error', () => {
  lobbyMusic.pause();
  musicToggle.textContent = '♫ โหลดไม่สำเร็จ';
  musicToggle.setAttribute('aria-label', 'โหลดเพลงไม่สำเร็จ');
});
