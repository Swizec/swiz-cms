import { useForm } from "react-hook-form";
import { Label, Input, Textarea, Button } from "theme-ui";

export const FrontmatterForm = ({ onSubmit }) => {
    const { register, handleSubmit } = useForm();

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Label>Title</Label>
            <Input name="title" ref={register} />

            <Label>Description</Label>
            <Textarea name="description" ref={register} />

            <Button type="submit" bg="secondary">
                Submit
            </Button>
        </form>
    );
};
