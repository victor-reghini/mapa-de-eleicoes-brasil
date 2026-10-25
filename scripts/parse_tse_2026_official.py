#!/usr/bin/env python3
import zlib, re, json, sqlite3, os

def parse_number(s):
    if not s:
        return 0
    clean = re.sub(r"[^\d]", "", s)
    return int(clean) if clean else 0

def parse_float(s):
    if not s:
        return 0.0
    clean = s.replace("%", "").replace(".", "").replace(",", ".").strip()
    try:
        return float(clean)
    except:
        return 0.0

def extract_pdf_lines(pdf_path):
    with open(pdf_path, "rb") as f:
        content = f.read()

    streams = re.findall(b"stream[\r\n]+(.*?)[\r\n]+endstream", content, re.DOTALL)
    lines = []
    for s in streams:
        try:
            decomp = zlib.decompress(s)
            for st in re.findall(rb"\((.*?)\)", decomp):
                try:
                    dec = st.decode("latin1").strip()
                    if dec:
                        lines.append(dec)
                except:
                    pass
        except:
            pass
    return lines

def main():
    pdf_path = "/tmp/tse_2026/6257_BR_BRASIL_2026_T1_PRESIDENTE.pdf"
    if not os.path.exists(pdf_path):
        print("PDF not found at", pdf_path)
        return

    lines = extract_pdf_lines(pdf_path)
    print(f"Loaded {len(lines)} lines from official PDF.")

    STATE_MAP = {
        "ACRE": "AC", "ALAGOAS": "AL", "AMAPÁ": "AP", "AMAZONAS": "AM", "BAHIA": "BA",
        "CEARÁ": "CE", "DISTRITO FEDERAL": "DF", "ESPÍRITO SANTO": "ES", "GOIÁS": "GO",
        "MARANHÃO": "MA", "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS", "MINAS GERAIS": "MG",
        "PARÁ": "PA", "PARAÍBA": "PB", "PARANÁ": "PR", "PERNAMBUCO": "PE", "PIAUÍ": "PI",
        "RIO DE JANEIRO": "RJ", "RIO GRANDE DO NORTE": "RN", "RIO GRANDE DO SUL": "RS",
        "RONDÔNIA": "RO", "RORAIMA": "RR", "SANTA CATARINA": "SC", "SÃO PAULO": "SP",
        "SERGIPE": "SE", "TOCANTINS": "TO", "EXTERIOR": "ZZ"
    }

    # Identify state blocks
    state_blocks = {}
    current_state = "BR"
    
    # Locate all Resumo Geral headers
    headers = []
    for i, l in enumerate(lines):
        m = re.search(r"Resumo Geral (?:\\\(|\()([^\\]+?)(?:\\\)|\))", l)
        if m:
            st_raw = m.group(1).strip().upper()
            if st_raw in STATE_MAP:
                headers.append((i, STATE_MAP[st_raw], st_raw))
        elif "Resumo Geral do Brasil" in l:
            headers.append((i, "BR", "BRASIL"))

    # Remove consecutive duplicate headers for the same state
    clean_headers = []
    for h in headers:
        if not clean_headers or clean_headers[-1][1] != h[1]:
            clean_headers.append(h)

    print("Clean state headers found:", len(clean_headers))
    for idx, (pos, uf, name) in enumerate(clean_headers):
        end_pos = clean_headers[idx+1][0] if idx+1 < len(clean_headers) else len(lines)
        state_blocks[uf] = lines[pos:end_pos]
        print(f"UF {uf} ({name}): lines {pos}..{end_pos} ({end_pos - pos} lines)")

    # Color mapping for candidates / parties
    CAND_COLORS = {
        "22": "#2563eb", # Flávio Bolsonaro (PL)
        "13": "#e11d48", # Lula (PT)
        "70": "#ea580c", # Augusto Cury (Avante)
        "14": "#8b5cf6", # Renan Santos (Missão)
        "55": "#0284c7", # Ronaldo Caiado (PSD)
        "30": "#f97316", # Romeu Zema (NOVO)
        "80": "#10b981", # Samara Martins (UP)
        "16": "#dc2626", # Hertz Dias (PSTU)
        "27": "#0284c7", # Clariana Zacarkim (DC)
        "21": "#991b1b", # Edmilson Costa (PCB)
        "35": "#059669", # Wilson Grassi (PMB)
        "29": "#7f1d1d"  # Rui Costa Pimenta (PCO)
    }

    CAND_NAMES = {
        "22": ("Flávio Bolsonaro", "PL"),
        "13": ("Lula", "PT"),
        "70": ("Augusto Cury", "AVANTE"),
        "14": ("Renan Santos", "MISSÃO"),
        "55": ("Ronaldo Caiado", "PSD"),
        "30": ("Romeu Zema", "NOVO"),
        "80": ("Samara Martins", "UP"),
        "16": ("Hertz Dias", "PSTU"),
        "27": ("Clariana Zacarkim", "DC"),
        "21": ("Edmilson Costa", "PCB"),
        "35": ("Wilson Grassi", "PMB"),
        "29": ("Rui Costa Pimenta", "PCO")
    }

    def parse_block_data(block_lines):
        text = " ".join(block_lines)
        
        # Turnout metrics
        aptos = 0
        comp = 0
        abst = 0
        validos = 0
        brancos = 0
        nulos = 0
        secoes_total = 0
        secoes_apuradas = 0

        for i, l in enumerate(block_lines):
            if "Eleitorado apto a votar" in l and i+1 < len(block_lines):
                aptos = parse_number(block_lines[i+1])
            elif "2.3 Comparecimento" in l:
                # Find number
                for k in range(i+1, min(len(block_lines), i+8)):
                    val = parse_number(block_lines[k])
                    if val > 1000 and comp == 0:
                        comp = val
            elif "2.4 Abstenção" in l:
                for k in range(i+1, min(len(block_lines), i+8)):
                    val = parse_number(block_lines[k])
                    if val > 1000 and abst == 0:
                        abst = val
            elif "1.2 Total de seções principais" in l or "1.Seções eleitorais" in l:
                for k in range(i+1, min(len(block_lines), i+6)):
                    val = parse_number(block_lines[k])
                    if val > 10 and secoes_total == 0:
                        secoes_total = val
            elif "2.1.1 Seções apuradas em urnas eletrônicas" in l:
                for k in range(i+1, min(len(block_lines), i+4)):
                    val = parse_number(block_lines[k])
                    if val > 10 and secoes_apuradas == 0:
                        secoes_apuradas = val
            elif "2.5.1 Total de votos - Presidente" in l:
                # Following lines contain: total, validos, brancos, nulos
                nums = []
                for k in range(i+1, min(len(block_lines), i+20)):
                    val = parse_number(block_lines[k])
                    if val > 0:
                        nums.append(val)
                if len(nums) >= 4:
                    validos = nums[1]
                    brancos = nums[2]
                    nulos = nums[3]

        # Candidates parsing: look for lines matching "*<num> - <NAME>" or "<num> - <NAME>"
        cands = []
        for i, l in enumerate(block_lines):
            cand_m = re.search(r"^\*?(\d{2})\s*-\s*([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ ]+)", l)
            if cand_m:
                num = cand_m.group(1)
                full_cand_name = cand_m.group(2).strip()
                # Find votes and percentage in nearby lines
                votes = 0
                pct = 0.0
                for k in range(max(0, i-6), i):
                    v = parse_number(block_lines[k])
                    p = parse_float(block_lines[k])
                    if "%" in block_lines[k] or ("," in block_lines[k] and p > 0 and p <= 100):
                        pct = p
                    elif v > 100 and votes == 0:
                        votes = v

                nome_urna, partido = CAND_NAMES.get(num, (full_cand_name.title(), "OUTRO"))
                cor = CAND_COLORS.get(num, "#64748b")

                cands.append({
                    "numero": num,
                    "nome": full_cand_name.title(),
                    "nomeUrna": nome_urna,
                    "partido": partido,
                    "cor": cor,
                    "votos": votes,
                    "pctValidos": pct,
                    "eleito": False
                })

        # Sort candidates by votes
        cands = sorted(cands, key=lambda c: c["votos"], reverse=True)
        return {
            "aptos": aptos,
            "comparecimento": comp,
            "abstencoes": abst,
            "votosValidos": validos,
            "votosBrancos": brancos,
            "votosNulos": nulos,
            "secoesTotal": secoes_total,
            "secoesApuradas": secoes_apuradas,
            "candidatos": cands
        }

    parsed_all = {}
    for uf, b_lines in state_blocks.items():
        parsed_all[uf] = parse_block_data(b_lines)
        top = parsed_all[uf]["candidatos"][0] if parsed_all[uf]["candidatos"] else None
        print(f"Parsed {uf}: Aptos={parsed_all[uf]['aptos']}, Válidos={parsed_all[uf]['votosValidos']}, Cands={len(parsed_all[uf]['candidatos'])}, Winner={top['nomeUrna'] if top else 'None'} ({top['pctValidos'] if top else 0}%)")

if __name__ == "__main__":
    main()
