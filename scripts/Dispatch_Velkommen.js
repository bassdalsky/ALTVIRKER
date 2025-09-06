// Dispatch_Velkommen – sender dispatch til GitHub Actions

const REPO_OWNER = 'bassdalsky';
const REPO_NAME  = 'ALTVIRKER';
const WORKFLOW   = 'velkomst-hybrid.yml';
const BRANCH     = 'main';

// Hent GITHUB_TOKEN frå Logic → Text variable
const vars = await Homey.logic.getVariables();
const tokenVar = vars.find(v => v.name === 'GITHUB_TOKEN');
if (!tokenVar) {
  throw new Error('Fant ikke Logic-variabel GITHUB_TOKEN. Opprett en tekstvariabel i Homey Logic.');
}
const githubToken = tokenVar.value;

const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW}/dispatches`;

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${githubToken}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ ref: BRANCH })
});

const txt = await res.text();
if (!res.ok) {
  console.error('❌ GitHub dispatch feila:', res.status, txt);
  throw new Error(`GitHub ${res.status}: ${txt}`);
}

console.log('🚀 Dispatch sendt ok:', res.status);
return true;
