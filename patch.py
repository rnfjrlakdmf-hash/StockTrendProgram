import codecs

with codecs.open('frontend/src/app/analysis/page.tsx', 'r', 'utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "{sectorSections[activeSectorTab].metrics.map((metric) => {" in line:
        if "const cat = (sectorData.charts || {})[metric.key];" in lines[i+1]:
            lines[i] = '''                                                    {(() => {
                                                        const visibleMetrics = sectorSections[activeSectorTab].metrics.filter((metric: any) => (sectorData.charts || {})[metric.key]);
                                                        if (visibleMetrics.length === 0) {
                                                            return (
                                                                <div className="col-span-full py-16 text-center bg-white/5 border border-dashed border-white/10 rounded-3xl">
                                                                    <div className="flex justify-center mb-4"><PieChart className="w-12 h-12 text-gray-600" /></div>
                                                                    <h3 className="text-gray-400 font-bold mb-2">데이터가 제공되지 않습니다</h3>
                                                                    <p className="text-gray-500 text-sm">해당 그룹(탭)의 섹터 분석 지표가 이 종목(또는 ETF)에는 제공되지 않습니다.<br/>다른 탭을 선택해 보세요.</p>
                                                                </div>
                                                            );
                                                        }
                                                        return visibleMetrics.map((metric: any) => {
                                                            const cat = (sectorData.charts || {})[metric.key];
                                                            return (\n'''
            lines[i+1] = ""
            lines[i+2] = ""
            lines[i+3] = ""
            
            for j in range(i+1, len(lines)):
                if "                                                })}" in lines[j] and j > i + 50:
                    lines[j] = "                                                    });\n                                                })()}\n"
                    break
            break

with codecs.open('frontend/src/app/analysis/page.tsx', 'w', 'utf-8') as f:
    f.writelines(lines)
