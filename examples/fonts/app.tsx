import {
  Box,
  Button,
  ChevronDownIcon,
  FormField,
  Rows,
  Select,
  Text,
  TextInput,
  Title,
  SegmentedControl,
  ImageCard,
} from "@canva/app-ui-kit";
import type { Font, FontStyle, FontWeightName } from "@canva/asset";
import { findFonts, requestFontSelection } from "@canva/asset";
import {
  FontRef,
  openDesign,
  addPage,
  readContent,
  getDefaultPageDimensions,
  getDesignToken,
  selection,
  getCurrentPageContext,
  overlay,
} from "@canva/design";
import { useState, useEffect, useCallback } from "react";
import * as styles from "styles/components.css";
import { useAddElement } from "utils/use_add_element";

type TextConfig = {
  text: string;
  color: string;
  fontSize: number;
  fontWeight: FontWeightName;
  fontStyle: FontStyle;
};

const initialConfig: TextConfig = {
  text: "Тестовый пример",
  color: "#8B3DFF",
  fontWeight: "normal",
  fontStyle: "normal",
  fontSize: 90,
};

const fontStyleOptions: {
  value: FontStyle;
  label: FontStyle;
  disabled?: boolean;
}[] = [
  { value: "normal", label: "normal", disabled: false },
  { value: "italic", label: "italic", disabled: false },
];

export const App = () => {
  const addElement = useAddElement();
  const [textConfig, setTextConfig] = useState<TextConfig>(initialConfig);
  const [selectedFont, setSelectedFont] = useState<Font | undefined>({
    ref: "YAEzvsyzAMI:0" as FontRef,
    name: "Funtastic",
    weights: [
      {
        weight: "normal",
        styles: ["normal"],
      },
    ],
    previewUrl:
      "https://media.canva.com/1/font-render/2/RnVudGFzdGlj_64_896_96_C_B_A_1.4_00000000_0e1318ff_A/aWZzOi8vLzE2Zjc5MTI4LTEwNDgtNGZjNy1hYTUyLTNhMTJiYzdlODk0YQ?osig=AAAAAAAAAAAAAAAAAAAAAHR1vtdd_Ff-CEHDuNM6jRtu-iK8RRNLfKwf-KVDcRQN&exp=1733412013&csig=AAAAAAAAAAAAAAAAAAAAAIs6Lldh-2lhMmyZ6XoSCTbjMDW79E430p1qIVMzcjAG",
  } as Font);
  const [availableFonts, setAvailableFonts] = useState<readonly Font[]>([]);

  const fetchFonts = useCallback(async () => {
    const response = await findFonts({});
    setAvailableFonts(response.fonts);
  }, [setAvailableFonts]);

  useEffect(() => {
    fetchFonts();
  }, [fetchFonts]);

  const { text, fontWeight, fontStyle } = textConfig;
  const disabled = text.trim().length === 0;
  const availableFontWeights = getFontWeights(selectedFont);

  const availableFontStyles = getFontStyles(fontWeight, selectedFont);
  const availableStyleValues = new Set(
    availableFontStyles.map((style) => style.value),
  ); // Create a Set for lookup
  const availableFontStyleOptions = fontStyleOptions.map((styleOption) => {
    // Check if the current style option is NOT present in the available styles.
    if (!availableStyleValues.has(styleOption.value)) {
      // If so, return a new object with `disabled` set to true, keeping the rest of the object the same.
      return { ...styleOption, disabled: true };
    }
    // If the style is available, return it as is. Also ensures disabled is set to false explicitly if not already defined.
    return { ...styleOption, disabled: false };
  });

  const resetSelectedFontStyleAndWeight = (selectedFont?: Font) => {
    setTextConfig((prevState) => {
      return {
        ...prevState,
        fontStyle:
          getFontStyles(fontWeight, selectedFont)[0]?.value || "normal",
        fontWeight: getFontWeights(selectedFont)[0]?.value || "normal",
      };
    });
  };

  async function handleOpenDesign() {
    const { width = 1920, height = 1080 } = {
      ...(await getDefaultPageDimensions()),
    };

    // readContent({ contentType: "richtext", context: "current_page" }, (draft) =>
    //   console.log("draft", draft),
    // );

    const dt = await getDesignToken();
    console.log("getDesignToken", dt);
    console.log("selection", selection);

    const cpc = await getCurrentPageContext();
    console.log("cpc", cpc);
    console.log("overlay", overlay);

    await addPage({
      title: `test`,
      elements: [
        {
          type: "text",
          ...textConfig,
          fontRef: selectedFont?.ref,
          children: [textConfig.text],
          top: 50,
          left: 100,
          width: width / 3,
        },
      ],
    });

    openDesign({ type: "current_page" }, async (draft) => {
      console.log(draft);

      if (draft.page.type !== "fixed") {
        return;
      }

      // Moving all elements 50 pixels to the right and 50 pixels down
      // draft.page.elements.forEach((element) => {
      //   element.left += 50;
      //   element.top += 50;
      //   console.log(`Moved element to (${element.left}, ${element.top}).`);
      // });

      draft.page.elements.forEach((element, index) => {
        console.log(
          `Element ${index + 1}: Type=${element.type}, Position=(${element.left}, ${element.top})`,
          element,
        );
        element.transparency = 0.35;
        //
      });

      return await draft.save();
    });
  }

  return (
    <div className={styles.scrollContainer}>
      <Rows spacing="2u">
        <Text>
          This example demonstrates how apps can apply fonts to text elements
          and add to design.
        </Text>
        <FormField
          label="Text"
          value={text}
          control={(props) => (
            <TextInput
              {...props}
              onChange={(value) => {
                setTextConfig((prevState) => {
                  return {
                    ...prevState,
                    text: value,
                  };
                });
              }}
            />
          )}
        />
        <Title size="small">Font selection</Title>
        {availableFonts.length > 0 && (
          <FormField
            label="Font family"
            value={selectedFont?.ref}
            control={(props) => (
              <Select
                {...props}
                stretch
                onChange={(ref) => {
                  const selected = availableFonts.find((f) => f.ref === ref);
                  setSelectedFont(selected);
                  resetSelectedFontStyleAndWeight(selected);
                }}
                options={availableFonts.map((f) => ({
                  value: f.ref,
                  label: f.name,
                }))}
              />
            )}
          />
        )}
        <Button
          variant="secondary"
          icon={ChevronDownIcon}
          iconPosition="end"
          alignment="start"
          stretch={true}
          onClick={async () => {
            const response = await requestFontSelection({
              selectedFontRef: selectedFont?.ref,
            });
            console.log(`requestFontSelection`, response);
            if (response.type === "completed") {
              setSelectedFont(response.font);
              resetSelectedFontStyleAndWeight(response.font);
            }
          }}
          disabled={disabled}
        >
          {selectedFont?.name || "Select a font"}
        </Button>
        {selectedFont?.previewUrl && (
          <Box background="neutralLow" padding="2u" width="full">
            <Rows spacing="0" align="center">
              <Box>
                <ImageCard
                  thumbnailUrl={selectedFont.previewUrl}
                  alt={selectedFont.name}
                />
              </Box>
            </Rows>
          </Box>
        )}
        <Title size="small">Font options</Title>
        <FormField
          label="Font weight"
          value={fontWeight}
          control={(props) => (
            <Select
              {...props}
              stretch
              onChange={(fontWeight) => {
                setTextConfig((prevState) => {
                  return {
                    ...prevState,
                    fontWeight,
                  };
                });
              }}
              disabled={!selectedFont || availableFontWeights.length === 0}
              options={availableFontWeights}
            />
          )}
        />
        <FormField
          label="Font style"
          value={fontStyle}
          control={(props) => (
            <SegmentedControl
              {...props}
              options={availableFontStyleOptions}
              value={fontStyle}
              onChange={(style) => {
                setTextConfig((prevState) => {
                  return {
                    ...prevState,
                    fontStyle: style,
                  };
                });
              }}
            />
          )}
        />
        <Button
          variant="primary"
          onClick={() => {
            addElement({
              type: "text",
              ...textConfig,
              fontRef: selectedFont?.ref,
              children: [textConfig.text],
            });
          }}
          disabled={disabled}
          stretch
        >
          Add text element
        </Button>

        <Button
          variant="primary"
          onClick={() => {
            handleOpenDesign();
          }}
          stretch
        >
          Create new page
        </Button>
      </Rows>
    </div>
  );
};

const getFontWeights = (
  font?: Font,
): {
  value: FontWeightName;
  label: FontWeightName;
}[] => {
  return font
    ? font.weights.map((w) => ({
        value: w.weight,
        label: w.weight,
      }))
    : [];
};

const getFontStyles = (
  fontWeight: FontWeightName,
  font?: Font,
): {
  value: FontStyle;
  label: FontStyle;
}[] => {
  return font
    ? (font.weights
        .find((w) => w.weight === fontWeight)
        ?.styles.map((s) => ({ value: s, label: s })) ?? [])
    : [];
};
