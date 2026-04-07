import codecs

def extract():
    with codecs.open('tmp_page_utf8.tsx', 'r', 'utf-8') as f:
        tmp_lines = f.readlines()
    blk = []
    fin = False
    for l in tmp_lines:
        if '{activeTab === "financial" && (' in l:
            fin = True
        if fin:
            blk.append(l)
            if '{activeTab === "sector" && (' in l or 'PEER TAB' in l:
                blk.pop()
                break
                
    with codecs.open('frontend/src/app/analysis/page.tsx', 'r', 'utf-8') as f:
        page_lines = f.readlines()
        
    out = []
    fin2 = False
    for l in page_lines:
        if '{activeTab === "financial" && (' in l:
            fin2 = True
            out.extend(blk)
            continue
        if fin2:
            if '{activeTab === "sector" && (' in l or 'PEER TAB' in l:
                fin2 = False
                out.append(l)
            continue
        out.append(l)
        
    with codecs.open('frontend/src/app/analysis/page.tsx', 'w', 'utf-8') as f:
        f.writelines(out)

extract()
