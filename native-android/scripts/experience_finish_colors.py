from pathlib import Path
import re
ui=Path(__file__).resolve().parents[1]/'app/src/main/java/com/paymatrix/app/ui'
for p in ui.glob('*.kt'):
    s=p.read_text()
    for value in ['141414','1C1C1C','222222','141416','18181B']:
        s=s.replace(f'Color(0xFF{value})','CardSurface')
    s=re.sub(r'(color|tint) = Ink.copy\(alpha = (?:0?\.[0-5]\d*f)\)',r'\1 = QuietText',s)
    if p.name=='GroupsScreens.kt':
        s=s.replace('.size(220.dp)\n                        .clip(RoundedCornerShape(20.dp))\n                        .background(Ink)', '.size(220.dp)\n                        .clip(RoundedCornerShape(20.dp))\n                        .background(Color.White)')
    p.write_text(s)
