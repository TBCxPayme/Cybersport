// отображение турнира и логика продвижения 1/2 мест из групп в полуфиналы и финал
async function init() {
  try {
    const r = await fetch('data.json?nocache=' + Date.now());
    const data = await r.json();
    renderTournament(data.rounds);
  } catch (e) {
    const bracket = document.getElementById('bracket');
    bracket.innerHTML = '<p style="color:#ff7777">Ошибка загрузки data.json</p>';
    console.error(e);
  }
}

function calcStandings(groupMatches) {
  // groupMatches: 3 матчa, 3 команды
  const teams = {};
  groupMatches.forEach(m => {
    const a = m.teamA || '';
    const b = m.teamB || '';
    if(!teams[a]) teams[a] = { name: a, pts:0, gd:0, gf:0 };
    if(!teams[b]) teams[b] = { name: b, pts:0, gd:0, gf:0 };
    // scores may be numbers or strings
    const sa = Number(m.scoreA);
    const sb = Number(m.scoreB);
    teams[a].gf += sa;
    teams[b].gf += sb;
    teams[a].gd += (sa - sb);
    teams[b].gd += (sb - sa);
    if(sa > sb) teams[a].pts += 3;
    else if(sb > sa) teams[b].pts += 3;
    else { teams[a].pts += 1; teams[b].pts += 1; }
  });
  const arr = Object.values(teams);
  // sort: pts desc, gd desc, gf desc, name asc
  arr.sort((x,y) => {
    if(y.pts !== x.pts) return y.pts - x.pts;
    if(y.gd !== x.gd) return y.gd - x.gd;
    if(y.gf !== x.gf) return y.gf - x.gf;
    return x.name.localeCompare(y.name,'ru');
  });
  return arr;
}

function renderTournament(rounds) {
  const bracket = document.getElementById('bracket');
  const champEl = document.getElementById('champion');
  bracket.innerHTML = '';
  champEl.textContent = '';

  // рассчитываем таблицы для групп (первые 2 из каждой группы)
  const groupStandings = [];

  rounds.forEach((round, rIdx) => {
    const roundEl = document.createElement('div'); roundEl.className='round';
    const title = document.createElement('h3'); title.textContent = round.name; roundEl.appendChild(title);

    // группы (первые два раунда будем считать группами)
    if(round.name.toLowerCase().includes('группа')) {
      // рендерим матчи
      round.matches.forEach((m)=>{
        const matchEl = document.createElement('div'); matchEl.className='match';
        const teamA = document.createElement('div'); teamA.className='team'; teamA.textContent = `${m.teamA} (${m.scoreA})`;
        const teamB = document.createElement('div'); teamB.className='team'; teamB.textContent = `${m.teamB} (${m.scoreB})`;
        // winner highlight
        const sa = Number(m.scoreA); const sb = Number(m.scoreB);
        if(!isNaN(sa) && !isNaN(sb)){
          if(sa > sb) teamA.classList.add('winner');
          else if(sb > sa) teamB.classList.add('winner');
        }
        matchEl.appendChild(teamA); matchEl.appendChild(teamB); roundEl.appendChild(matchEl);
      });

      // standings table
      const standings = calcStandings(round.matches);
      groupStandings.push(standings);
      const table = document.createElement('table'); table.className='table';
      table.innerHTML = `<thead><tr><th>#</th><th>Команда</th><th>Очки</th><th>ЗМ</th><th>Разн.</th></tr></thead>`;
      const tbody = document.createElement('tbody');
      standings.forEach((t,i)=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i+1}</td><td>${t.name}</td><td>${t.pts}</td><td>${t.gf}</td><td>${t.gd}</td>`;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      roundEl.appendChild(table);
    } else {
      // плей-офф — отрисовать матчи (и подсветить победителя если есть)
      round.matches.forEach((m)=>{
        const matchEl = document.createElement('div'); matchEl.className='match';
        const teamA = document.createElement('div'); teamA.className='team'; teamA.textContent = `${m.teamA} (${m.scoreA})`;
        const teamB = document.createElement('div'); teamB.className='team'; teamB.textContent = `${m.teamB} (${m.scoreB})`;
        const sa = Number(m.scoreA); const sb = Number(m.scoreB);
        if(!isNaN(sa) && !isNaN(sb)){
          if(sa > sb) teamA.classList.add('winner');
          else if(sb > sa) teamB.classList.add('winner');
        }
        matchEl.appendChild(teamA); matchEl.appendChild(teamB); roundEl.appendChild(matchEl);
      });
    }

    bracket.appendChild(roundEl);
  });

  // заполнить полуфиналы автоматически из таблиц, если они есть
  // ожидаем: groupStandings[0] — Группа A, [1] — Группа B
  if(groupStandings.length >= 2){
    const gA = groupStandings[0];
    const gB = groupStandings[1];

    // 1A vs 2B -> SF1
    const sf1 = rounds.find(r => r.name.toLowerCase().includes('полуфин') || r.name.toLowerCase().includes('полуфинал'))?.matches?.[0];
    const sf2 = rounds.find(r => r.name.toLowerCase().includes('полуфин') || r.name.toLowerCase().includes('полуфинал'))?.matches?.[1];
    const pfRound = rounds.find(r => r.name.toLowerCase().includes('полуфин') || r.name.toLowerCase().includes('полуфинал'));
    if(pfRound){
      pfRound.matches[0].teamA = gA[0]?.name || '1A';
      pfRound.matches[0].teamB = gB[1]?.name || '2B';
      pfRound.matches[1].teamA = gB[0]?.name || '1B';
      pfRound.matches[1].teamB = gA[1]?.name || '2A';
    }

    // если полуфиналы уже сыграны — заполнить финал
    const final = rounds[rounds.length -1];
    if(final && final.matches && final.matches[0]){
      const sfRound = pfRound;
      const sfm0 = sfRound.matches[0];
      const sfm1 = sfRound.matches[1];
      const w1 = (Number(sfm0.scoreA) > Number(sfm0.scoreB)) ? sfm0.teamA : (Number(sfm0.scoreB) > Number(sfm0.scoreA) ? sfm0.teamB : null);
      const w2 = (Number(sfm1.scoreA) > Number(sfm1.scoreB)) ? sfm1.teamA : (Number(sfm1.scoreB) > Number(sfm1.scoreA) ? sfm1.teamB : null);
      // если есть конкретные победители — подставим в финал
      if(w1) final.matches[0].teamA = w1;
      else final.matches[0].teamA = final.matches[0].teamA || 'Winner SF1';
      if(w2) final.matches[0].teamB = w2;
      else final.matches[0].teamB = final.matches[0].teamB || 'Winner SF2';
    }
  }

  // обновить ещё раз (чтобы отрисовать изменённые плей-офф имена)
  // Для простоты — перезагрузим визуал без запроса файла:
  // (этот обход нужен, чтобы применить изменения в rounds в DOM)
  // Но чтобы избежать рекурсии, просто перерисуем плей-офф части:
  // (реализация выше обновила rounds в памяти, но чтобы отобразить новые значения — вызовём снова render)
  // Упрощённо: второй проход гарантирует что финал и полуфиналы покажут актуальные команды.
  // (Обычно можно структурировать код чище — но для компактности сделаем повторный проход один раз.)
  // Соберём обновлённые данные и отрисуем снова простым способом:
  // (на практике это быстрый метод для статичных данных)
  // — создадим shallow copy и повторно отрисуем
  // Prevent infinite loop: only run once by checking a flag
  if(!window.__renderedOnce) {
    window.__renderedOnce = true;
    // slight timeout to avoid sync reentry issues
    setTimeout(()=> renderTournament(rounds), 10);
    return;
  }

  // определяем чемпиона, если финал сыгран
  const finalRound = rounds[rounds.length -1];
  if(finalRound && finalRound.matches && finalRound.matches[0]){
    const fm = finalRound.matches[0];
    const fa = Number(fm.scoreA), fb = Number(fm.scoreB);
    if(!isNaN(fa) && !isNaN(fb)){
      if(fa > fb) champEl.textContent = `— ${fm.teamA} 🏆`;
      else if(fb > fa) champEl.textContent = `— ${fm.teamB} 🏆`;
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
